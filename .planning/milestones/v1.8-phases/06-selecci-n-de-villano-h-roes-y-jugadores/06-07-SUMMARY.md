---
phase: 06-selecci-n-de-villano-h-roes-y-jugadores
plan: 07
subsystem: verification
tags: [gates-mecanicos, verificacion-humana, d-36, cierre-de-fase]
dependency-graph:
  requires:
    - 06-03-PLAN.md (alias confirmados)
    - 06-06-PLAN.md (cableado completo)
  provides:
    - 06-07-GATES.md (evidencia mecánica)
  affects:
    - Fase 7 (hereda la selección verificada como entrada de los contadores)
tech-stack:
  added: []
  patterns:
    - "Seleccionar todo al enfocar un campo cuyo valor por defecto se comporta como placeholder"
key-files:
  created:
    - .planning/phases/06-selecci-n-de-villano-h-roes-y-jugadores/06-07-GATES.md
  modified:
    - app/components/PlayerModal.vue
decisions:
  - "Las 14 comprobaciones humanas pasaron a la primera, sin ningún defecto"
  - "Una mejora de comportamiento pedida por el usuario se aplicó aquí en vez de en un ciclo de gaps — desviación explícita, ver abajo"
requirements: [SEL-01, SEL-02, SEL-03, SEL-04, SEL-05, SEL-06, SEL-07, SEL-08, SEL-09]
---

# Plan 06-07 — Cierre de la fase: gates mecánicos y verificación humana

**Estado:** completo · 2026-09-08
**Tareas:** 2/2

## Task 1 — Barrido de gates mecánicos

Ejecutada durante el run autónomo nocturno. Los ocho gates pasan, con su salida
literal transcrita en **`06-07-GATES.md`** (fichero aparte a propósito: escribir el
SUMMARY entonces habría marcado el plan como completo con la Task 2 sin hacer).

Resumen: `npm test` 19/465 · `build` y `generate` exit 0 · **exactamente 1 línea
añadida** a `content/marvel-champions.json` y **0 líneas de `text`/`speech` tocadas` ·
deriva de voz verde con **35 clips** intactos · catálogo y alias verificados dentro del
bundle generado · `engine/persistence.ts`, `usePersistedSession.ts` y
`useStepShortcuts.ts` sin tocar · `contentVersion` sigue en 13 · cero dependencias
nuevas.

## Task 2 — Verificación humana en navegador

Realizada por el usuario el 2026-09-08 en `npm run dev`, viewport apaisado de tablet,
3 jugadores / Normal.

### Veredicto

**Las 14 comprobaciones pasaron.** Palabras del usuario:

> «Aprobado! […] Por lo demas, funciona perfecto.»

Sin ningún defecto. Incluidas las tres que ningún test automatizado puede cubrir y que
el `06-CONTEXT.md` señalaba como trampas:

| # | Comprobación | Resultado |
|---|---|---|
| 6 | **D-12** — escribir `Ana Maria` con espacio dentro del modal no avanza el paso; al cerrar, el espacio vuelve a avanzar | ✓ |
| 9 | **D-16/D-32** — el `⚠` de héroe repetido no es pulsable y `SIGUIENTE` no se queja | ✓ |
| 12 | **SEL-08** — recargar conserva villano, héroes y nombre | ✓ |

Las otras once (rejilla visible, texto sin encoger, SIGUIENTE libre, modal de villano,
foco inicial fuera de los campos, filtro por los tres campos e insensible a acentos,
nombre en la rejilla, marcador `ya:` en gris y pulsable, tres vías de cierre con
devolución de foco, resto de la app intacto, y el retorno desde la ronda de D-18)
también pasaron.

### Mejora pedida durante la verificación, y aplicada

El usuario pidió una sola cosa:

> «al hacer focus al input de "Jugador 1" automaticamente se seleccione todo el texto
> y si escribes que se borre y asi no tienes que borrar y escribir, solo escribir»

Aplicada en `app/components/PlayerModal.vue` (`onNameFocus`): al enfocar el campo se
selecciona todo, de modo que escribir sustituye en vez de añadirse. El valor por
defecto pasa a comportarse como el placeholder que en realidad es.

Dos notas técnicas:
- **No rompe D-09.** El modal sigue sin dar foco a ningún campo al abrirse; la
  selección solo ocurre cuando el usuario toca el campo deliberadamente. El teclado no
  aparece solo.
- El `select()` va aplazado un tick con `setTimeout(0)`. En Safari de iOS un `select()`
  llamado dentro del propio manejador de `focus` lo deshace después el gesto táctil que
  causó ese focus; aplazarlo lo coloca después del gesto. Confirmado funcionando en el
  navegador del usuario; **pendiente de confirmar en la tablet real**, como el resto
  del comportamiento táctil de la fase.

## Desviación (una, deliberada)

El plan dice, en los criterios de aceptación de la Task 2, que un defecto de
**comportamiento** encontrado en la verificación se registre como gap para
`/gsd:plan-phase --gaps` y **no** se parchee en este plan.

La mejora de arriba es un cambio de comportamiento y se aplicó aquí igualmente. Motivos:
no es un *defecto* sino una mejora pedida por el usuario con el contexto ya cargado; es
un manejador de una línea sin lógica de dominio; no toca ninguna decisión bloqueada; y
montar un ciclo de planificación de gaps entero para un `select()` habría sido ceremonia
sin valor. La desviación se registra aquí, no se disimula.

## Verificación final tras la mejora

- `npm test`: 19 ficheros / **465 tests** en verde
- `npm run build`: exit 0
- D-09 comprobado a mano: el foco inicial sigue yendo al botón cerrar

## Límite honesto que queda anotado

Todo esto se verificó en **viewport simulado en portátil**, no en la tablet de mesa,
cuyo modelo y sistema operativo **siguen sin conocerse desde la Fase 1**. Sigue
pendiente en el dispositivo real, en particular:

- El comportamiento del teclado en pantalla con los paneles a `max-h-[80dvh]`
  (`06-UI-REVIEW.md`, warning 1 — mitigado pasando de `vh` a `dvh`, no probado).
- El `select()` aplazado del campo de nombre en Safari de iOS.
- Los objetivos táctiles a un brazo de distancia.

Es deuda heredada de v1.7 (DEV-01/DEV-02), no algo que esta fase haya introducido, y el
ROADMAP dice explícitamente que esta verificación **no es bloqueante** para cerrar la
fase.
