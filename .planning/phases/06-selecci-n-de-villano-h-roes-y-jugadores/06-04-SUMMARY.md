---
phase: 06-selecci-n-de-villano-h-roes-y-jugadores
plan: 04
subsystem: ui
tags: [modal, tailwind, vue, seleccion-heroes, formularios]

requires:
  - phase: 06-selecci-n-de-villano-h-roes-y-jugadores (plan 02)
    provides: "useHeroSearch.ts (filterHeroOptions), useCharacterCatalogue.ts, spanish-hero-aliases.ts"
provides:
  - app/components/VillainPickerModal.vue
  - app/components/PlayerModal.vue
affects: [06-06-PLAN.md (cablea ambos modales desde app/pages/[game]/index.vue), 06-07-PLAN.md (verificacion humana en navegador de ambos componentes)]

tech-stack:
  added: []
  patterns:
    - "Modal de eleccion (VillainPickerModal/PlayerModal): mismo trio onKeydown/onMounted/onUnmounted de WarningDetailModal.vue, foco inicial siempre en el boton cerrar, tres vias de cierre equivalentes (Escape/velo/X), max-h-[80vh] + flex-col para paneles que desplazan una lista"
    - "Primeros <input> de texto de la app: bg-background + border-b-2 border-transparent focus:border-accent outline-none, sin autofocus, con <label for> real"
    - "Componentes tontos consumen funciones puras de useHeroSearch.ts (filterHeroOptions) en vez de reimplementar filtrado/orden"

key-files:
  created:
    - app/components/VillainPickerModal.vue
    - app/components/PlayerModal.vue
  modified: []

key-decisions:
  - "Los dos componentes usan ids estaticos para <label for> (player-modal-name-input, player-modal-hero-filter-input, villain-picker-heading, player-modal-heading) porque solo un modal de seleccion esta montado a la vez (activeSelectionModal es una unica ref que cableara el plan 06-06); si un futuro plan permitiera dos modales simultaneos, estos ids tendrian que volverse dinamicos"

requirements-completed: [SEL-02, SEL-04, SEL-05, SEL-06, SEL-07]

duration: 35min
completed: 2026-09-08
---

# Phase 6 Plan 04: VillainPickerModal y PlayerModal Summary

**Dos modales de eleccion tontos (Tailwind puro, sin libreria): selector de villano de 3 entradas sin filtro, y modal de jugador con campo Nombre (maxlength 14), filtro insensible a acentos sobre 23 heroes y marcadores `✓`/`ya:` co-ocurrentes.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2/2 completadas
- **Files modified:** 2 (ambos nuevos)

## Accomplishments

- `VillainPickerModal.vue`: modal de 3 villanos + "Sin elegir", sin filtro (D-10), foco inicial en `✕`, tres vias de cierre equivalentes que no descartan nada (D-13).
- `PlayerModal.vue`: campo `Nombre` (valor real "Jugador N" por defecto, `maxlength="14"`, guarda en cada pulsacion), filtro de heroe que NO roba el foco (D-09), lista de 23 heroes en dos lineas ordenada por `filterHeroOptions`, marcador `ya: {nombre}` en `text-secondary-text` (nunca `text-warning`) que puede co-ocurrir con el `✓` de la eleccion propia (D-16), y estado de filtro vacio con el copy exacto del contrato.
- Ambos componentes siguen "tontos": ninguno importa `~~/engine/*`, ninguno reimplementa filtrado/orden — consumen `filterHeroOptions` de `useHeroSearch.ts` (plan 06-02) tal cual.
- Ningun texto se pinta con `v-html`; el nombre que teclea el jugador se interpola siempre (T-01-01).

## Task Commits

Each task was committed atomically:

1. **Task 1: VillainPickerModal.vue** - `80a1cb9` (feat)
2. **Task 2: PlayerModal.vue** - `ed5ee52` (feat)

**Plan metadata:** (pendiente — commit de cierre de este plan)

## Files Created/Modified

- `app/components/VillainPickerModal.vue` - Modal de eleccion de villano: 3 entradas de catalogo + "Sin elegir", marcador `✓` en la eleccion actual, sin filtro.
- `app/components/PlayerModal.vue` - Modal de jugador: campo Nombre + filtro de heroe + lista de 23 con marcadores `✓`/`ya:` co-ocurrentes.

## Decisions Made

- Ver `key-decisions` en el frontmatter: ids estaticos para las etiquetas de los campos de texto, correcto mientras solo exista un modal de seleccion activo a la vez.
- Se uso `v-model` en el campo de filtro de heroe (en vez de un manejador `@input` explicito como en el campo Nombre) porque el filtro es puramente local a este componente y nunca se emite hacia afuera — no hay tension con D-13 (que exige guardar el nombre en cada pulsacion, no el texto de busqueda).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - bug propio, detectado antes de commitear] Comentarios de cabecera citaban literalmente las cadenas que los propios criterios de aceptacion del plan cuentan por grep**

- **Found during:** Task 1 y Task 2, verificacion de acceptance criteria antes de cada commit.
- **Issue:** en `VillainPickerModal.vue`, un comentario explicando el `max-h-[80vh]` citaba literalmente `max-h-[80vh]` una segunda vez (fuera de la clase real), otro citaba literalmente `Sin elegir` al explicar el numero de filas, y otro citaba literalmente la palabra `Escape` en mayuscula junto a la de la linea de codigo real — cada uno hacia que el grep de aceptacion correspondiente (que exige exactamente 1 aparicion) devolviera 2. En `PlayerModal.vue`, un comentario sobre el limite de caracteres citaba literalmente `engine/selection.ts`, lo que hacia que el grep `engine/` (que exige 0 apariciones en todo el fichero, para garantizar que el componente no importa el motor) devolviera 1 — un falso positivo, porque el codigo real no tiene ningun import de `~~/engine/*`, solo la prosa del comentario mencionaba la ruta del fichero del motor.
- **Fix:** reescritos los comentarios para transmitir el mismo significado sin repetir la cadena literal exacta que el criterio de aceptacion busca (p. ej. "el motor reimpone el mismo limite como constante propia al guardar la sesion" en vez de nombrar el fichero y la constante; "la tecla de escape" en minuscula en la prosa, dejando la unica `'Escape'` literal en el codigo real).
- **Files modified:** `app/components/VillainPickerModal.vue`, `app/components/PlayerModal.vue`.
- **Verification:** los 27 greps de acceptance-criteria de ambas tareas devuelven exactamente el conteo exigido; `npm run build` sale con exit code 0; `npm test` sigue en 19/464.
- **Committed in:** `80a1cb9` (Task 1), `ed5ee52` (Task 2) — el fix se aplico antes del commit correspondiente, no como un commit separado.

---

**Total deviations:** 1 auto-fixed (1 bug propio de redaccion, ninguno de logica o comportamiento).
**Impact on plan:** Cero impacto en el comportamiento o el contrato visual; el patron ya estaba documentado como riesgo conocido en `06-02-SUMMARY.md` (mismo tipo de falso positivo con los mismos gates de grep) y se resolvio de la misma forma.

## Issues Encountered

Ninguno mas alla de la deviacion documentada arriba. `npx nuxt typecheck` no esta disponible en este proyecto (no hay `vue-tsc` instalado), asi que la verificacion automatizada de ambas tareas cayo al siguiente eslabon de la cadena de verificacion del propio plan (`npm test`), que sigue en verde (19 ficheros / 464 tests, mismo baseline reportado al inicio de la ejecucion).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Los dos componentes existen, compilan (`npm run build` exit 0) y siguen literalmente `06-UI-SPEC.md` §Layout 3 y §Layout 4 (clases Tailwind, copy, foco inicial en `✕`, tres vias de cierre equivalentes).
- **Sin verificacion visual en navegador** — ninguno de los dos ficheros esta cableado todavia a ninguna pagina (eso es tarea del plan 06-06) ni tiene test de componente (no existe entorno de test de componentes en el proyecto, decision explicita de `06-04-PLAN.md` §test_reality). La verificacion humana real ocurre en el plan 06-07.
- El plan 06-06 puede consumir `VillainPickerModal` y `PlayerModal` directamente: la interfaz de props/emits implementada coincide literalmente con el contrato `<interfaces>` de `06-04-PLAN.md` (que ese mismo plan declara "no re-negociable").
- Ningun bloqueo conocido para 06-05/06-06.

## Known Stubs

Ninguno. Ambos componentes son funcionalidad completa y consumible tal cual desde el contrato de props/emits — no tienen datos mock ni ramas sin implementar. Quedan "mudos" (nadie los importa aun en ninguna pagina) hasta que el plan 06-06 los cablee, lo cual es el reparto de trabajo explicito entre planes de esta ola, no un stub.

## Threat Flags

Ninguno. Ambos ficheros cubren exactamente la superficie ya prevista en el `<threat_model>` del plan (T-06-10 interpolacion del nombre, T-06-11 `maxlength`, T-06-12 filas nunca `disabled`, T-06-13 titulo fijo al numero de hueco) sin introducir ningun endpoint, ruta de red, ni cambio de esquema de persistencia.

---
*Phase: 06-selecci-n-de-villano-h-roes-y-jugadores*
*Completed: 2026-09-08*
