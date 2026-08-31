---
quick_id: 260831-g2s
slug: atajos-de-teclado
subsystem: ui
tags: [vueuse, keyboard-shortcuts, accessibility-tradeoff, useeventlistener, ssg]

# Dependency graph
requires:
  - phase: app/pages/[game]/index.vue
    provides: "onNext/onBack síncronos ya existentes (llaman a next()/prev() + announce()), los cinco banderines de overlay ya declarados"
provides:
  - "Composable useStepShortcuts.ts con tres funciones puras testeadas (resolveShortcutAction, shortcutsEnabled, isEditableTarget) más el cableado del listener"
  - "Espacio/Enter equivalen a SIGUIENTE y flecha izquierda a ATRÁS en la pantalla de juego, cuando se usa en portátil"
affects: [ui-desktop-usage, future-keyboard-a11y-work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Decisión de atajo de teclado extraída a funciones puras testeadas en entorno node (sin DOM), mismo patrón que resolveVoiceState/shouldAnnounce en useVoiceAnnouncer.ts"
    - "useEventListener('keydown', fn) de @vueuse/core SIN target: cae en defaultWindow (undefined en servidor), SSR-safe para nuxt generate, limpieza automática por scope"

key-files:
  created:
    - app/composables/useStepShortcuts.ts
    - app/composables/__tests__/useStepShortcuts.test.ts
  modified:
    - "app/pages/[game]/index.vue"

key-decisions:
  - "D-Q1: el atajo es DUEÑO de las tres teclas mientras está activo — event.preventDefault() se llama ANTES de invocar el manejador, resolviendo a la vez el desplazamiento de página por Espacio y la activación nativa del botón enfocado (doble avance). Coste aceptado: Espacio/Enter dejan de activar el botón que tenga el foco (Índice, control de voz, ⚠, opciones del turno) mientras la pantalla de juego está activa sin overlay."
  - "D-Q2: decisión en funciones puras (resolveShortcutAction, shortcutsEnabled, isEditableTarget), cableado del listener aparte y sin testear — mismo patrón que useVoiceAnnouncer.ts"
  - "D-Q3: onNext()/onBack() se llaman como sentencia plana SÍNCRONA dentro del propio manejador de keydown, sin await/setTimeout/nextTick — preserva la cadena de gesto de usuario de la que depende <audio>.play()/speechSynthesis.speak() (fases 03 y 03.1)"
  - "D-Q4: con cualquiera de los cinco overlays abiertos las teclas no hacen nada; no se añade cierre por Escape a IndexOverlay en este encargo"
  - "D-Q5: el atajo también vale en la pantalla 'Mesa lista' (kind: summary), mapeando a los mismos onNext/onBack que sus botones"
  - "D-Q6: sin pista visual del atajo — se vería también en la tablet, donde es ruido puro"
  - "D-Q7: Shift no bloquea el atajo (Shift+Espacio se trata igual que Espacio); Ctrl/Cmd/Alt sí lo bloquean"

patterns-established:
  - "Guardas de teclado en orden de más barata a más específica: enabled -> repeat -> modificadores -> campo editable -> mapa de teclas, con la función total (nunca lanza)"

requirements-completed: []

# Metrics
duration: N/A (continuación de sesión previa)
completed: 2026-08-31
---

# Quick Task 260831-g2s: Atajos de teclado Summary

**Espacio/Enter avanzan y flecha izquierda retrocede en la pantalla de juego cuando se usa en portátil, con la decisión extraída a tres funciones puras testeadas y el listener cableado sin tocar ni un píxel de la interfaz táctil.**

## Performance

- **Tasks:** 3 (2 `auto` con TDD en la Task 1 + 1 `checkpoint:human-verify`, aprobado por el usuario)
- **Files modified:** 3 (2 creados, 1 modificado)

## Accomplishments

- En un portátil, pulsar Espacio o Enter en la pantalla de juego hace exactamente lo mismo que
  pulsar SIGUIENTE (avanza un paso y locuta); la flecha izquierda hace lo mismo que ATRÁS.
- Resuelto el doble avance: tras pulsar SIGUIENTE/ATRÁS con el ratón (que deja el foco en ese
  botón), el siguiente Espacio avanza exactamente un paso, nunca dos, y nunca en la dirección
  equivocada.
- El atajo se desactiva por completo con cualquiera de los cinco overlays abiertos (índice,
  modal de detalle, reanudación, aviso de contenido cambiado, diálogo de descarte), no se repite
  con autorrepetición de tecla, no responde a Ctrl/Cmd/Alt, y no desplaza la página.
- La experiencia táctil de la tablet queda byte a byte igual: cero cambios de plantilla, cero
  componentes de presentación tocados.
- La cadena de gesto de usuario que llega hasta `<audio>.play()`/`speechSynthesis.speak()`
  (fases 03 y 03.1) queda intacta: `onNext()`/`onBack()` se invocan de forma síncrona dentro del
  propio manejador de `keydown`, sin ningún `await`/`setTimeout`/`nextTick` de por medio.

## Task Commits

1. **Task 1: Funciones puras de decisión del atajo, con sus tests** — `9f98ff0` (test, TDD)
   `app/composables/useStepShortcuts.ts`, `app/composables/__tests__/useStepShortcuts.test.ts`
2. **Task 2: Cablear el listener y engancharlo a onNext/onBack** — `46b0003` (feat)
   `app/composables/useStepShortcuts.ts`, `app/pages/[game]/index.vue`
3. **Task 3: checkpoint:human-verify** — sin commit propio (checkpoint de verificación); el
   usuario probó los atajos en el portátil y respondió **"aprobado"**, incluido el coste
   aceptado de D-Q1 (ver Decisiones más abajo).

**Plan metadata:** este commit (`docs(quick-260831-g2s): ...`)

## Files Created/Modified

- `app/composables/useStepShortcuts.ts` — tres funciones puras exportadas
  (`resolveShortcutAction`, `shortcutsEnabled`, `isEditableTarget`) que operan sobre objetos
  planos con forma de pato (nunca `KeyboardEvent`/`EventTarget` reales, porque el proyecto
  `app-logic` de Vitest corre en entorno node sin DOM), más el composable de cableado
  `useStepShortcuts(enabled, { onNext, onBack })` que registra `useEventListener('keydown', …)`
  de `@vueuse/core` sin target (SSR-safe) y llama a `event.preventDefault()` solo en el camino
  en que el atajo decide actuar.
- `app/composables/__tests__/useStepShortcuts.test.ts` — 33 tests nuevos, un `describe` por
  función, cubriendo el contrato completo: las cinco teclas mapeadas y su negativo, `enabled`
  en false para todas las teclas, autorrepetición, los tres modificadores tecla a tecla,
  Shift+Espacio (D-Q7), campo editable, los siete motivos de desactivación de
  `shortcutsEnabled` por separado más el caso "todo despejado", y la frontera de que un
  `<button>` no es editable.
- `app/pages/[game]/index.vue` — import de `shortcutsEnabled`/`useStepShortcuts`; `computed`
  `atajosActivos` que llama a `shortcutsEnabled({...})` con los seis campos de estado (sin
  reimplementar la condición en línea); una única llamada
  `useStepShortcuts(atajosActivos, { onNext, onBack })` al final del `<script setup>`. Cero
  cambios en la plantilla.

## Decisions Made

Ver `key-decisions` en el frontmatter (D-Q1 a D-Q7, tomadas en planificación y aplicadas sin
revisitar). La más relevante para quien retome este código:

- **D-Q1 — coste aceptado y explícito.** El atajo se adueña de Espacio/Enter/flecha izquierda
  mientras está activo: en cuanto decide actuar llama a `event.preventDefault()` **antes** de
  invocar `onNext()`/`onBack()`. Esa única llamada, en el único sitio en que el atajo actúa,
  cancela a la vez el desplazamiento de página por Espacio y la activación nativa del control
  que tenga el foco — sin depender de dónde esté aparcado el foco y sin tocar `NavBand.vue`.
  **Coste:** mientras la pantalla de juego está activa y sin overlay, Espacio y Enter dejan de
  activar el botón que tuviera el foco (Índice, control de voz, `⚠`, opciones del turno). Un
  usuario que navegase SOLO con teclado no podría activarlos con esas teclas. Se acepta porque
  la app está diseñada para toque/puntero a un brazo de distancia (no navegación por teclado),
  todos esos controles siguen siendo accesibles con dedo/ratón, y el atajo se desactiva por
  completo en cuanto hay un overlay abierto (donde el teclado conserva su comportamiento
  normal). El usuario probó esto explícitamente en el portátil y lo aprobó con ese coste
  entendido.
  - *Alternativa rechazada — ignorar el evento si el foco está en un elemento interactivo*: deja
    ganar la activación nativa, lo que produce fallos reales en esta pantalla: si el usuario
    pulsó ATRÁS con el ratón, el siguiente Espacio **retrocedería** en vez de avanzar; si cerró
    el modal de detalle (que devuelve el foco al botón `⚠`), el siguiente Espacio **reabriría el
    modal**. Y como un clic con ratón produce `:focus` sin `:focus-visible`, no habría ningún
    anillo de foco visible que explicara por qué la tecla hizo otra cosa — un fallo silencioso.
  - *Alternativa rechazada — `blur()` al avanzar*: obliga a tocar `NavBand.vue` (o interceptar
    clics en toda la página), no cubre los demás botones enfocables, y depende de un
    comportamiento de foco al hacer clic que varía entre Safari y Chrome. Más superficie de
    código y menos determinista que `preventDefault()`.
  - *Alternativa rechazada — listener en fase de captura*: no aporta nada; un listener en
    `window` en fase de burbuja ya se ejecuta antes de que el navegador aplique su acción por
    defecto.
  - Salida natural si algún día molesta: acotar la propiedad de Enter (dejarle activar el
    control enfocado) sin tocar Espacio — cambio de dos líneas en la función pura, ya anticipado
    en el propio PLAN.md.
- **D-Q3 — regla de gesto de usuario intacta.** `useStepShortcuts` invoca `handlers.onNext()`/
  `handlers.onBack()` como sentencia plana, síncrona, dentro del propio manejador de `keydown` —
  sin `await`, `setTimeout`, `nextTick` ni `.then()` de por medio. Es el mismo cimiento del que
  depende toda la locución de las fases 03/03.1 (`<audio>.play()`/`speechSynthesis.speak()` en
  el mismo tick del gesto de usuario); romperlo habría descartado la locución en silencio en
  iPad/Safari. Verificado por el orquestador: 0 ocurrencias reales de `await`/`setTimeout`/
  `nextTick` en `useStepShortcuts.ts` (ver Verificación abajo).

## Deviations from Plan

None — plan ejecutado exactamente como estaba escrito.

## Verificación (independiente, realizada por el orquestador antes de este cierre)

- `npm run test`: **278/278** en verde, 12 ficheros de test (base 245 + 33 nuevos de
  `useStepShortcuts.test.ts`).
- **Asincronía real en `useStepShortcuts.ts`: 0.** El `grep` literal del plan
  (`grep -rn "await\|setTimeout\|nextTick"`) daba 6 coincidencias, pero eran falsos positivos:
  la subcadena `await` aparece dentro de los identificadores `awaitingResumeChoice` y
  `awaitingContentChangedAck`/`awaitingDiscardConfirm` (nombres de estado, no la palabra clave
  `await`). Reconfirmado con `grep -nE '\bawait\b|\bsetTimeout\b|\bnextTick\b'` con límites de
  palabra, excluyendo comentarios → **0 reales**. Anotado aquí para que nadie reabra esto
  creyendo que es un problema.
- **`event.preventDefault()`: 1 sola llamada real** (dentro del handler de `useStepShortcuts`).
  El conteo literal de ocurrencias de la cadena `preventDefault` daba 4 porque la palabra
  también aparece en tres comentarios explicativos (D-Q1). Mismo caso de falso positivo por
  grep ingenuo — anotado para que no se reabra.
- **Referencias directas a `window`: 0** (solo se menciona la palabra dentro de un comentario) —
  el prerender de `nuxt generate` (SSG) no se rompe; la sobrecarga sin target de
  `useEventListener` cae en `defaultWindow`, `undefined` en servidor.
- `git diff --stat` limita el cambio a los 3 ficheros previstos en el frontmatter del plan;
  `content/marvel-champions.json` **no aparece** — ningún clip de audio pregenerado (fase 03.1)
  queda invalidado.
- Plantilla de `app/pages/[game]/index.vue`: **0 líneas** añadidas fuera de `<script setup>` —
  la interfaz táctil queda idéntica byte a byte.

## Issues Encountered

None.

## Deuda anotada, no silenciada

1. **`IndexOverlay` no escucha Escape**, a diferencia de `WarningDetailModal` (que sí trae su
   propio listener y sigue cerrándose con Escape sin cambios). Es un hueco conocido, señalado
   ya en el PLAN.md (D-Q4) como **fuera de alcance** de este encargo — el acuerdo con el usuario
   fue "desactivado mientras haya cualquier overlay abierto", no "añadir cierre por Escape a
   todos los overlays". Candidato natural para una quick futura si se decide homogeneizar el
   cierre por teclado de todos los overlays.
2. **No se añadió ninguna pista visual del atajo** (D-Q6, decisión explícita, no un olvido). Un
   indicador tipo "[Espacio]" bajo el botón SIGUIENTE se vería SIEMPRE, también en la tablet,
   donde no significa nada y es ruido visual puro contra el objetivo de CLAUDE.md de una
   interfaz legible a un brazo de distancia. Espacio/Enter son además el atajo más adivinable
   que existe. Si el usuario lo pide más adelante, se resuelve como quick aparte.

## User Setup Required

None.

## Next Phase Readiness

No bloquea nada del milestone en curso. Esta quick task es ortogonal a la fase 03.1 (voz
pregenerada), que sigue bloqueada en 03.1-03 por la cuota diaria de Gemini TTS (9/37 clips) —
este encargo no tocó ninguna clave `speech`/`text` ni `content/marvel-champions.json`.

---
*Quick task: 260831-g2s-atajos-de-teclado*
*Completed: 2026-08-31*

## Self-Check: PASSED

- FOUND: `.planning/quick/260831-g2s-atajos-de-teclado/260831-g2s-SUMMARY.md`
- FOUND: commit `9f98ff0` (Task 1)
- FOUND: commit `46b0003` (Task 2)
- `npm run test`: 278/278 verde, 12 ficheros de test (reconfirmado en este cierre)
