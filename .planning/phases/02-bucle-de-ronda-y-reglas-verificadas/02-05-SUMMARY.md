---
phase: 02-bucle-de-ronda-y-reglas-verificadas
plan: 05
subsystem: content
tags: [zod, vitest, vue, marvel-champions, rules-fidelity, content-review]

# Dependency graph
requires:
  - phase: 02-01
    provides: sección `ronda` en content/marvel-champions.json con 10 pasos, avisos y citas
  - phase: 02-03
    provides: modal de aviso clicable (`WarningDetailModal.vue`) reutilizado por `warningDetail`
  - phase: 02-04
    provides: veredicto humano de CONT-09/D-36 con dos correcciones pendientes (C1, C2) sobre `ronda.jugadores.01`, diferidas por exigir una capacidad de esquema que no existía
provides:
  - Capacidad de esquema/tipos/resolución `options[]` (label ≤40, detail ≤320, 2..8 entradas) + `optionsWarning` (≤60), con reglas de dependencia y unicidad de label, disponible para cualquier paso del contenido y para juegos futuros (Warhammer 40.000)
  - Bloque de opciones pulsables en `StepScreen.vue`, reutilizando `WarningDetailModal.vue` (prop `tone`) para el detalle de cada opción
  - `ronda.jugadores.01` con las seis opciones del turno (Rules Reference v1.7, Player Turn p. 34) y el recordatorio de Estados siempre visible en la fase de jugadores
  - CONT-09 CERRADO — visto bueno incondicional del usuario en la app, transcrito literal en `02-CONTENT-REVIEW.md`
affects: [phase-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Campo de lista pulsable en TextBlock: `X[]` (contenido) + `XWarning` (recordatorio siempre visible sin detalle) como par plano, mismo prefijo que `warning`/`warningDetail` (DC-10)"
    - "Un recordatorio sin consecuencia enunciada nunca lleva detalle y por tanto nunca es pulsable — se pinta como texto plano, nunca con la afordancia de aviso ni de acento (DC-11, D-32)"
    - "El modal de detalle se generaliza con un prop `tone` en vez de clonarse: `tone:'warning'` antepone el glifo reservado a trampas, `tone:'neutral'` no — mismo componente, dos disparadores (DC-12)"
    - "Estado efímero de UI con más de un disparador (⚠ + opciones) se modela como un único ref discriminado, nunca como banderas booleanas paralelas (DC-15)"
    - "Una corrección de revisión humana que el esquema no puede expresar se registra como PENDIENTE con su razón de esquema y se difiere a un plan dedicado, en vez de forzarse dentro de campos existentes — y ese plan dedicado cierra el gate original, no abre uno nuevo"

key-files:
  created: []
  modified:
    - engine/types.ts
    - engine/schema.ts
    - engine/resolve.ts
    - engine/__tests__/schema.test.ts
    - engine/__tests__/resolve.test.ts
    - engine/__tests__/content.test.ts
    - content/marvel-champions.json
    - app/components/StepScreen.vue
    - app/components/WarningDetailModal.vue
    - app/pages/[game]/index.vue
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/phases/02-bucle-de-ronda-y-reglas-verificadas/02-CONTENT-REVIEW.md

key-decisions:
  - "CONT-09 estaba abierto al terminar 02-04 (el veredicto humano trajo C1/C2, no una aprobación incondicional). Este plan construye la capacidad de esquema que faltaba, aplica C1/C2, y obtiene el visto bueno final del usuario en la app — con eso, CONT-09 pasa de abierto a CERRADO. La cadena completa (02-04 revisión -> C1/C2 diferidas -> 02-05 capacidad construida -> visto bueno final) queda legible de punta a punta en 02-CONTENT-REVIEW.md"
  - "DC-10: options[] = [{label ≤40, detail obligatorio ≤320}], 2..8 entradas; optionsWarning ≤60 como campo plano hermano, mismo patrón de nombres que warning/warningDetail"
  - "DC-11: el recordatorio de Estados NO es una opción de la lista, es una línea siempre visible bajo ella — porque D-30 lo fija como recordatorio puro sin consecuencia enunciada, y sin consecuencia no puede tener detalle (D-32, sin afordancia falsa); además semánticamente 'mirar los Estados' no es una acción del turno, así que tampoco encaja bajo el rótulo 'Opciones'"
  - "DC-12: WarningDetailModal.vue se reutiliza con un prop tone ('warning' | 'neutral') en vez de clonarse o renombrarse — el glifo ⚠ solo se pinta en tone:'warning', reservado por 02-UI-SPEC a pasos con trampa"
  - "DC-13: las opciones usan el registro de acento (border-accent/50, chevron text-accent), nunca el de aviso (amarillo), porque 02-UI-SPEC reserva el amarillo exclusivamente a avisos con trampa"
  - "DC-15: isWarningDetailOpen + warningTriggerEl se sustituyen por un único activeDetail: Ref<{heading, body, tone} | null> + detailTriggerEl, para que dos disparadores (⚠ y opciones) no puedan producir el estado imposible de dos paneles abiertos"
  - "ronda.jugadores.01.optionsWarning y ronda.villano.02.warning son carácter-idénticos por decisión explícita del usuario (misma frase, misma fase de mirar), y quedan bajo una aserción de igualdad exacta en content.test.ts — tocar uno sin el otro rompe la suite"
  - "El veredicto final del usuario fue 'aprobado' sin condiciones: cubrió las tres partes del guion (A: las seis opciones · B: recordatorio de Estados · C: no-regresión de lo ya aprobado), incluidas las dos opciones que él no había listado en su borrador (Usar un poder básico, Activar aliados), que se autoraron desde el Rules Reference p. 34 porque son justo por donde atacan los héroes"

patterns-established:
  - "Lista pulsable de contenido en TextBlock: campo `X[]` de entradas {label, detail obligatorio} + campo hermano `XWarning` para el recordatorio sin consecuencia — reutilizable por futuros pasos y por el contenido de Warhammer 40.000"
  - "Componente de panel de detalle con prop `tone` para servir a más de un disparador semántico sin clonar componente"

requirements-completed: [CONT-07, CONT-09, CONT-10, CONT-11, PERS-03, UI-09]

# Metrics
duration: 55min
completed: 2026-08-29
---

# Phase 2 Plan 5: Lista de opciones del turno + recordatorio de Estados (cierre de CONT-09) Summary

**`options[]`/`optionsWarning` de punta a punta en esquema/UI, las seis opciones del turno de `ronda.jugadores.01` contrastadas contra el Rules Reference v1.7 (p. 34), y visto bueno incondicional del usuario en la app que cierra CONT-09.**

## Performance

- **Duration:** 55 min (Tareas 1-3 en sesión previa; esta continuación ejecutó solo la Tarea 4)
- **Started:** 2026-08-29 (Tarea 1)
- **Completed:** 2026-08-29T23:58:00Z (Tarea 4, esta continuación)
- **Tasks:** 4/4
- **Files modified:** 13 (10 de código/contenido en Tareas 1-2, 3 de documentación en Tareas 3-4)

## Por qué este plan existe: cierra un gate que `02-04` dejó abierto

`02-04-SUMMARY.md` fue explícito: *"CONT-09 se cumple en proceso, no en contenido definitivo"*. El veredicto humano de la Tarea 2 de `02-04` no fue una aprobación incondicional — trajo dos correcciones de fondo (C1: falta una lista de opciones del turno, clicable; C2: falta el recordatorio de Estados también en la fase de jugadores) que el esquema vigente no podía expresar sin falsear el veredicto o desbordar presupuestos de campo existentes. `02-04` las registró como **PENDIENTES** y las difirió aquí, dejando escrito: *"La fase 02 no se da por completa hasta que 02-05 incorpore C1 y C2"*.

Este plan construye la capacidad de esquema que faltaba, aplica C1 y C2, y — en esta continuación — obtiene el visto bueno del usuario **en la app**, no en el diff. Con ese visto bueno, **CONT-09 queda cerrado**: dejó de estar "en proceso" para estar satisfecho de punta a punta.

## Accomplishments

- **Nueva capacidad de esquema reutilizable:** `TextBlock` gana `options?: StepOption[]` (`{label ≤40, detail ≤320}`, 2..8 entradas, `detail` obligatorio en cada una) y `optionsWarning?: string` (≤60), con dos reglas nuevas en el `superRefine` de raíz de `GameDefinitionSchema`: un `optionsWarning` sin `options` falla nombrando el paso, y dos opciones con la misma `label` en el mismo paso fallan igual. `resolveText` los fusiona con el mismo patrón `??` que `warning`/`warningDetail`, con sustitución completa del array (no fusión elemento a elemento) cuando una variante de dificultad redefine `options`. Esta capacidad queda disponible para cualquier paso futuro y para el contenido de Warhammer 40.000, no solo para `ronda.jugadores.01`.
- **Las seis opciones del turno, autoradas y citadas:** `ronda.jugadores.01` enumera ahora Cambiar Alter-Ego/Héroe · Poner cartas en juego · Utilizar eventos · Usar un poder básico · Activar aliados · Activar habilidades «Acción» — las cuatro que el usuario nombró en su borrador más las dos que él no había listado (poder básico, aliados), añadidas porque el Rules Reference v1.7 «Player Turn» (p. 34) las lista como parte de las seis opciones oficiales del turno, y son justo por donde atacan los héroes: el eje donde tiene sentido C2.
- **El recordatorio de Estados, ahora simétrico entre las dos fases:** `ronda.jugadores.01.optionsWarning` es carácter-idéntico a `ronda.villano.02.warning` («Atentos a los Estados en los personajes»), bajo una aserción de igualdad exacta en `content.test.ts` que rompe la suite si alguien toca uno sin el otro. Se pinta siempre visible, sin borde ni chevron: no es una opción de la lista (DC-11) porque no tiene consecuencia enunciada (D-30) y por tanto no puede tener detalle (D-32) sin fingir una afordancia falsa.
- **UI pulsable reutilizando el modal existente:** `StepScreen.vue` pinta la rejilla de las seis opciones en el registro de acento (nunca en el de aviso, reservado a trampas) y la línea de `optionsWarning` sin afordancia; `WarningDetailModal.vue` gana un prop `tone` (`'warning' | 'neutral'`) en vez de clonarse; `[game]/index.vue` unifica el estado del panel en un único `activeDetail` (DC-15), eliminando el estado imposible de dos paneles abiertos.
- **Documentos de verdad del proyecto actualizados y luego cerrados:** `ROADMAP.md`/`REQUIREMENTS.md` reflejaron primero el estado real de la Fase 2 (incompleta, séptimo criterio de éxito, UI-09 ampliada), y `02-CONTENT-REVIEW.md` recibió primero el registro de C1/C2 como aplicadas-pendientes-de-visto-bueno y, en esta continuación, la sección final que **declara CONT-09 cerrado**.
- **CONT-09 CERRADO — visto bueno incondicional del usuario en la app.** Veredicto literal: *"aprobado"*. Cubrió las tres partes del guion (A: las seis opciones tocadas una a una · B: el recordatorio de Estados siempre visible y su gemelo intacto en la fase del villano · C: no-regresión del aviso del dial y del bucle completo de ronda). Transcrito literal y fechado en `02-CONTENT-REVIEW.md`.

## Task Commits

1. **Tarea 1: `options[]` y `optionsWarning` de punta a punta (esquema, tipos, resolución, contenido)** - `73aaad2` (feat) — 24 tests nuevos, `contentVersion` 9→10
2. **Tarea 2: bloque de opciones pulsables + modal reutilizado** - `5f176d2` (feat) — `StepScreen.vue`, `WarningDetailModal.vue` (prop `tone`), `activeDetail` único en `index.vue` (DC-15)
3. **Tarea 3: ROADMAP/REQUIREMENTS/dossier actualizados** - `e2669c3` (docs) — UI-09 ampliada, C1/C2 registradas como aplicadas-pendientes-de-visto-bueno
4. **Tarea 4: visto bueno del usuario sobre C1/C2 en la app — cierre de CONT-09** - `247aa17` (docs) — veredicto literal "aprobado" transcrito, CONT-09 declarado cerrado

**Plan metadata:** commit final pendiente (ver más abajo, `docs({phase}-{plan}): complete plan`)

_Nota: la Tarea 1 llevó tdd="true"; los commits `test`/`feat` intermedios de RED/GREEN quedan dentro del commit único `73aaad2` reportado por la sesión previa (ver detalle completo en el propio commit)._

## Files Created/Modified

- `engine/types.ts` - `StepOption { label, detail }`; `TextBlock` gana `options?`/`optionsWarning?`
- `engine/schema.ts` - `TextBlockSchema` con `options`/`optionsWarning` (sin `.default()`); dos reglas nuevas en el `superRefine` de raíz (huérfano y unicidad de label)
- `engine/resolve.ts` - `resolveText` fusiona `options`/`optionsWarning` con el patrón `??`, sustitución completa del array por variante
- `engine/__tests__/schema.test.ts`, `engine/__tests__/resolve.test.ts`, `engine/__tests__/content.test.ts` - 24 tests nuevos cubriendo `<behavior>` de la Tarea 1, incluidos dos gates que muerden sobre copias en memoria del JSON real
- `content/marvel-champions.json` - `contentVersion` 9→10; `ronda.jugadores.01` gana `options` (6 entradas) y `optionsWarning`; ningún otro campo ni paso tocado
- `app/components/StepScreen.vue` - rótulo `OPCIONES`, rejilla de opciones pulsables en registro de acento, línea `optionsWarning` sin afordancia
- `app/components/WarningDetailModal.vue` - prop `tone?: 'warning' | 'neutral'`, glifo `⚠` condicional
- `app/pages/[game]/index.vue` - `activeDetail`/`detailTriggerEl` únicos, `onOpenOptionDetail(index)`
- `.planning/ROADMAP.md` - Fase 2 vuelta a incompleta, fila de `02-05`, séptimo criterio de éxito
- `.planning/REQUIREMENTS.md` - UI-09 ampliada a las dos superficies, nota de REF-01 actualizada
- `.planning/phases/02-bucle-de-ronda-y-reglas-verificadas/02-CONTENT-REVIEW.md` - sección "C1 y C2 — de PENDIENTES a APLICADAS" (Tarea 3) y sección final "Visto bueno del usuario en la app — cierre de CONT-09" (Tarea 4, esta continuación)

## Decisions Made

Ver `key-decisions` en el frontmatter (DC-10 a DC-15, más el cierre de CONT-09). Resumen de las dos más delicadas para quien retome este código:

- **DC-11 (por qué el recordatorio de Estados no es una opción pulsable):** el usuario elogió una **línea siempre visible**, no un modal escondido tras un toque — copiarlo tras un toque habría sido más débil justo en el eje que él señaló. Además D-30 fija los Estados como recordatorio puro sin consecuencia enunciada (la carta física lleva la regla, D-31); sin consecuencia no hay detalle, y sin detalle D-32 prohíbe la afordancia pulsable. Semánticamente, "mirar los Estados" tampoco es una acción del turno, así que ni por forma ni por fondo encaja bajo el rótulo "Opciones". Un contribuidor futuro que vea seis opciones pulsables y una línea suelta podría, por simetría visual, intentar "arreglarlo" convirtiéndola en una séptima opción — esta nota es para que no lo haga sin releer DC-11 primero.
- **El invariante de igualdad C2:** `ronda.jugadores.01.optionsWarning` y `ronda.villano.02.warning` son la misma cadena, carácter a carácter, por decisión explícita del usuario (misma frase para el mismo tipo de recordatorio en las dos fases). `content.test.ts` los congela con una aserción de igualdad exacta, no con dos regex parecidas: tocar uno sin el otro rompe la suite inmediatamente.

## Deviations from Plan

None — plan ejecutado tal como estaba escrito. La Tarea 4 (checkpoint humano) recibió un veredicto de aprobación incondicional sin correcciones que aplicar, así que no hubo cambios de contenido ni de esquema en esa tarea: solo la transcripción literal del veredicto y el cierre de CONT-09 en el dossier, exactamente como preveía la rama "si es «aprobado»" de la acción de la Tarea 4.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

Ninguno. Las seis opciones tienen `detail` obligatorio y ya autorado (sin esquema lo impide); ningún componente recibe datos vacíos o mock.

## Threat Flags

Ninguno nuevo respecto al `threat_model` del plan. Las mitigaciones T-02-01 (interpolación exclusiva), T-02-11 (recordatorio huérfano), T-02-12 (unicidad de label), T-02-13 (topes de longitud), T-02-14 (afordancia falsa) y T-02-10 (paridad C2) quedan todas cubiertas por los gates cableados en `content.test.ts`/`schema.test.ts` descritos arriba. T-02-09 (repudiation) queda satisfecha por el veredicto literal y fechado transcrito en `02-CONTENT-REVIEW.md` en esta misma tarea.

## Next Phase Readiness

- **CONT-09 cerrado.** El contenido de la sección `ronda` es definitivo: revisado por una persona contra el Rules Reference v1.7, con las dos correcciones de esa revisión (C1, C2) incorporadas y verificadas por el propio usuario en la app. No queda ninguna corrección abierta sobre `ronda`.
- **Fase 2 lista para su verificación de fase.** Los 5 planes de la Fase 2 (`02-01` a `02-05`) están completos; `ROADMAP.md`/`REQUIREMENTS.md` reflejan el estado real, incluido el séptimo criterio de éxito de la Fase 2 y UI-09 ampliada a las dos superficies pulsables (aviso `⚠` y opciones del turno).
- **Capacidad reutilizable para fases futuras.** `options[]`/`optionsWarning` es una capacidad de esquema genérica, no acoplada a Marvel Champions: cualquier paso futuro (incluido el contenido de Warhammer 40.000) puede declarar una lista de opciones pulsables sin tocar el esquema de nuevo.
- **No quedan bloqueadores** para avanzar a la siguiente fase.

---
*Phase: 02-bucle-de-ronda-y-reglas-verificadas*
*Completed: 2026-08-29*

## Self-Check: PASSED
- FOUND: engine/schema.ts
- FOUND: engine/resolve.ts
- FOUND: engine/types.ts
- FOUND: app/components/StepScreen.vue
- FOUND: app/components/WarningDetailModal.vue
- FOUND: app/pages/[game]/index.vue
- FOUND: .planning/phases/02-bucle-de-ronda-y-reglas-verificadas/02-CONTENT-REVIEW.md
- FOUND commit 73aaad2 (Tarea 1)
- FOUND commit 5f176d2 (Tarea 2)
- FOUND commit e2669c3 (Tarea 3)
- FOUND commit 247aa17 (Tarea 4)
- content/marvel-champions.json: git diff empty at continuation start, contentVersion confirmed 10
- npx vitest run: 133/133 green
- npx nuxt build: clean
