---
phase: 02-bucle-de-ronda-y-reglas-verificadas
verified: 2026-08-30T00:20:00Z
status: human_needed
score: 7/7 roadmap success criteria verified; 0 blockers; 7 warnings carried from code review (independently confirmed)
overrides_applied: 0
gaps: []
deferred: []
human_verification:
  - test: "Abrir el modal de detalle (⚠ o cualquier opción del turno) en un iPad real (Safari), pulsar SIGUIENTE o el botón ≡ mientras el modal sigue abierto (usando un teclado Bluetooth o VoiceOver para navegar con Tab, ya que el tap no mueve el foco en WebKit)"
    expected: "El foco debería quedar atrapado dentro del modal (o el fondo debería quedar inerte) y el foco debería devolverse al botón que abrió el panel al cerrarlo"
    why_human: "Requiere un dispositivo iPad/Safari real o un lector de accesibilidad; no se puede verificar con grep ni con un test de Vitest en jsdom. El código (WarningDetailModal.vue, app/pages/[game]/index.vue) confirma que no hay focus-trap y que el disparador se captura con document.activeElement, que es <body> en WebKit — el comportamiento descrito en 02-REVIEW.md WR-02/WR-03 es una deducción de código verificada por mí, pero su impacto real en un iPad físico no se ha probado en ningún punto de esta fase (los playtests documentados en 02-CONTENT-REVIEW.md se hicieron con `npm run dev`, previsiblemente en un navegador de escritorio, donde los botones sí retienen el foco al pulsarlos)."
---

# Fase 2: Bucle de ronda y reglas verificadas — Informe de verificación

**Objetivo de la fase:** Un grupo puede jugar una partida completa de Marvel Champions de principio a fin: tras la preparación, la fase de los jugadores, la fase del villano (con sus 6 pasos oficiales) y el fin de ronda se encadenan en un bucle que vuelve solo al punto correcto, ronda tras ronda, con el contenido corregido y verificado contra los errores ya detectados en el borrador.

**Verificado:** 2026-08-30T00:20:00Z
**Estado:** human_needed (todos los truths automatizables están VERIFIED; queda un ítem de accesibilidad en dispositivo real, no cubierto por ningún playtest documentado de esta fase)
**Re-verificación:** No — verificación inicial.

## Resumen ejecutivo

No he confiado en ningún número de los SUMMARY. Verificaciones propias:

- `npx vitest run`: **133/133 verde**, ejecutado por mí (7 ficheros).
- `npx nuxt build`: build completo (client+server+prerender) sin errores, ejecutado por mí.
- Inspeccioné directamente `content/marvel-champions.json` (`contentVersion: 10`, 1 sección `repeats:true`, 2 fases de 4+6=10 pasos, `ronda.jugadores.01` con 6 `options` + `optionsWarning`) — coincide byte a byte con lo que describen los SUMMARY.
- Leí íntegros `engine/header.ts`, `engine/toc.ts`, `engine/resolve.ts`, `engine/schema.ts` (gates D-37, D-32, C1/C2), `app/components/StepScreen.vue`, `app/components/WarningDetailModal.vue`, `app/pages/[game]/index.vue`, `engine/persistence.ts`, `app/composables/usePersistedSession.ts` — no solo grep superficial.
- Repliqué por mi cuenta el probe de `02-REVIEW.md` CR-01: inyecté `branches` en una copia de `ronda.villano.02` y ejecuté `validateGameDefinition` importado directamente vía `vite-node` (no me limité a leer la afirmación del revisor). **Confirmado independientemente: la validación pasa, `branches` queda `undefined` en el objeto validado (stripeado, no rechazado).**
- Confirmé que `app/composables/useGameContent.ts` envía al navegador el JSON crudo (`marvelChampions as GameDefinition`), sin pasar nunca por Zod — la brecha entre "objeto validado" y "objeto servido" que describe CR-01 es real, no una inferencia del revisor.
- Crucé los `requirements:` de los 5 PLAN contra `.planning/REQUIREMENTS.md` y la línea `**Requirements**` de la Fase 2 en `ROADMAP.md`: FLOW-03/04/07/08, CONT-02…07, CONT-09, ADAPT-04, UI-09 — los 13 IDs de la fase están cubiertos por al menos un plan; ninguno huérfano.

**Sobre el hallazgo Crítico de `02-REVIEW.md` (CR-01):** lo he verificado yo mismo (no heredado del revisor) y es real: `GameDefinitionSchema` usa `z.object()` (modo *strip*, no *reject*) en los seis esquemas de objeto, y `useGameContent.ts` sirve al navegador el JSON crudo sin pasar por Zod. Esto significa que el objeto que valida CI y el objeto que renderiza la tablet son dos objetos distintos, y el test que existe expresamente para vigilar D-33 (`content.test.ts:299`, "sin campo `branches`") lee el objeto ya validado, del que Zod ya ha borrado el campo — es estructuralmente incapaz de fallar.

**Mi valoración, independiente de la del revisor, sobre si esto invalida el criterio de éxito 5** ("todo el contenido de la ronda queda verificado... antes de darse por definitivo"): **no lo invalida, pero sí erosiona la garantía "bajo gate automático" para cualquier cambio futuro.** El criterio 5 se apoya en dos pilares distintos: (a) la revisión humana D-36/CONT-09, que ocurrió de verdad —tabla de 10 pasos contrastada página a página contra el PDF, veredicto literal transcrito, dos correcciones de fondo (C1/C2) diferidas hasta construir la capacidad de esquema correcta y luego aplicadas, aprobación final incondicional "aprobado" tras jugar en la app— y (b) el gate automático de CI. El pilar (a) está intacto y es la evidencia dominante de CONT-09; lo he leído completo en `02-CONTENT-REVIEW.md` y no encuentro ninguna laguna en esa cadena. El pilar (b) es el que CR-01 debilita: no protege contra un campo desconocido o mal escrito (p. ej. un futuro `warningDetails` con "s" de más), y ese es exactamente el modo de fallo silencioso que `CLAUDE.md` dice haber elegido Zod para evitar ("el opuesto de fallar ruidosamente en el build"). Para el contenido **ya autorado y ya revisado por el usuario** de esta fase, ningún campo desconocido existe hoy (lo comprobé: los seis esquemas no tienen ningún campo extra en el JSON real), así que el contenido que juega el grupo hoy es correcto. El riesgo es hacia adelante: la próxima persona que añada un paso (Fase 3, o Warhammer 40.000) tiene un gate que no la protege de un typo. Por eso lo clasifico como **WARNING, no BLOCKER**: no hay ninguna verdad observable de esta fase que sea falsa hoy por culpa de CR-01, pero es una brecha real de calidad que conviene cerrar antes de que el proyecto añada más contenido.

## Logro del objetivo

### Verdades observables (mapeadas a los 7 criterios de éxito de ROADMAP.md)

| # | Verdad (criterio de éxito) | Estado | Evidencia |
|---|---|---|---|
| 1 | El usuario completa la fase de los jugadores (descartar, robar, preparar) y recorre la fase del villano con sus 6 pasos oficiales, en el orden del reglamento | ✓ VERIFIED | `content/marvel-champions.json`: `ronda.jugadores` 4 pasos, `ronda.villano` 6 pasos, orden confirmado contra RR v1.7 p.45 en `02-CONTENT-REVIEW.md`. `engine/__tests__/content.test.ts` gate estructural (recuento 4+6) y `engine/__tests__/navigator.test.ts` recorre la secuencia real (`sequence.length===34`) |
| 2 | Al avanzar desde el último paso vuelve al primer paso de jugadores (no a preparación) e incrementa ronda; saltar a un paso del bucle desde el índice y seguir avanzando continúa el bucle; un salto a preparación no toca el contador de ronda | ✓ VERIFIED | `engine/__tests__/navigator.test.ts:137-212` ejecuta `next()`/`prev()`/`jumpTo()` contra el contenido real (no solo el fixture): `loopStartIndex=24`, `loopEndIndex=33`, cierre con `round+1`, apertura con `round-1` (salvo ronda 1), `jumpTo` deja `round` intacto en ambas direcciones. Leí `engine/navigator.ts` — la lógica coincide |
| 3 | El usuario ve el agotamiento del mazo de jugador y el de encuentros como casos distintos con sus consecuencias correctas, el cambio de fase del villano, y Aturdido/Confundido/Duro con su resolución | ✓ VERIFIED | `ronda.jugadores.03.warningDetail` (mazo de jugador: barajar descarte + repartirse encuentro boca abajo) y `ronda.villano.04.warningDetail` (mazo de encuentros: barajar + ficha de aceleración) son consecuencias distintas, confirmado leyendo el JSON. Estados: `ronda.villano.02.warning` "Atentos a los Estados" (D-31: recordar mirar, la carta lleva la regla) |
| 4 | En pasos con ramas Héroe/Alter-Ego, ambas ramas se ven a la vez como texto, sin toque | ✓ VERIFIED | `ronda.villano.02.text`: "El villano ataca a cada héroe y avanza el esquema contra quien esté en Alter-Ego" — frase colectiva única (D-33), sin campo `branches`. Gate `content.test.ts:295-300` comprueba ausencia de `branches` (aunque ver nota de CR-01 sobre la solidez de ESTE gate en concreto, más abajo) |
| 5 | Todo el contenido de la ronda queda verificado contra el Rules Reference v1.7 antes de darse por definitivo, incluidas las 4 correcciones confirmadas | ✓ VERIFIED (proceso humano) / ⚠ gate automático debilitado | `02-CONTENT-REVIEW.md`: tabla de 10 pasos con cita página a página, 5 correcciones objetivas de citas/omisiones aplicadas y confirmadas, veredicto humano literal ("aprobado" incondicional tras C1/C2), las 4 correcciones del borrador (6 pasos villano / obligaciones "una o más" / solo Villano roba boost / Experto no altera estructura) todas bajo test en `content.test.ts`. Ver CR-01 en el resumen ejecutivo: el gate automático no protege contra campos desconocidos, pero eso no vuelve incorrecto el contenido ya revisado |
| 6 | Avisos ⚠ con consecuencia detallada son tocables y cierran al instante sin perder paso/ronda; los que no tienen consecuencia no ofrecen afordancia | ✓ VERIFIED | `StepScreen.vue`: rama `v-if="warningText && warningDetailText"` (botón con borde+chevron) vs. `v-else-if="warningText"` (`<p>` plano, sin afordancia) — leído directo, coincide exactamente con D-32. `onDismissDetail` en `index.vue` solo pone `activeDetail = null`, nunca toca `cursor`/`round` |
| 7 | En el paso de turnos, el usuario ve las opciones enumeradas (cambiar de forma, cartas, eventos, poder básico, aliados, "Acción") y puede tocar cualquiera para ver su detalle; tiene siempre a la vista el recordatorio de Estados también cuando atacan los héroes | ✓ VERIFIED | `ronda.jugadores.01.options`: 6 entradas confirmadas leyendo el JSON, cada una con `detail` autorado. `optionsWarning`: "Atentos a los Estados en los personajes" — carácter-idéntico a `ronda.villano.02.warning` (confirmado). `StepScreen.vue` renderiza la rejilla de opciones pulsable + la línea de `optionsWarning` sin afordancia, siempre visible cuando existe |

**Puntuación:** 7/7 criterios de éxito del roadmap verificados como TRUE en el código actual.

### Artefactos requeridos (muestra representativa, los 5 planes)

| Artefacto | Esperado | Estado | Detalle |
|---|---|---|---|
| `content/marvel-champions.json` | sección `ronda` repeats:true, 2 fases, 10 pasos, `options`/`optionsWarning` en `ronda.jugadores.01`, `contentVersion: 10` | ✓ VERIFIED | Confirmado por inspección directa del JSON (no solo grep) |
| `engine/schema.ts` | gate D-37 (`repeating.length !== 1`), `warningDetail`, `options[]`/`optionsWarning` con reglas de dependencia | ✓ VERIFIED | Leído completo; todas las reglas presentes y activas en `superRefine` |
| `engine/header.ts` | `describeHeader` — contador relativo a fase dentro del bucle, global fuera | ✓ VERIFIED | Leído completo; lógica correcta en ambas ramas, TECH-04 respetado (cero referencias a ids de juego concreto) |
| `engine/toc.ts` | reordenado + atenuado + supresión de `✓` dentro del bucle | ✓ VERIFIED | Leído completo; correcto, aunque `TocBlock` no expone `id` estable (ver WR-05 abajo) |
| `app/components/WarningDetailModal.vue` | modal de un botón, cierre por botón/velo/Escape | ✓ VERIFIED (parcial) | Existe, funciona para los tres cierres declarados; **no atrapa el foco** (ver hallazgo humano abajo) |
| `app/components/StepScreen.vue` | avisos con/sin afordancia, rejilla de opciones pulsable | ✓ VERIFIED | Leído completo; ambas ramas correctas |

### Verificación de enlaces clave

| Desde | Hasta | Vía | Estado | Detalle |
|---|---|---|---|---|
| `content/marvel-champions.json` | `engine/expand.ts` | `repeats:true` deriva `loopStartIndex`/`loopEndIndex` | ✓ WIRED | `navigator.test.ts` confirma `24`/`33` sobre el contenido real |
| `app/composables/useGameSession.ts` | `engine/header.ts` | computed que envuelve `describeHeader` | ✓ WIRED | Confirmado leyendo `useGameSession.ts` |
| `app/pages/[game]/index.vue` | `app/components/IndexOverlay.vue` | prop `title` alimentado por `plainSectionTitle` | ✓ WIRED | Confirmado |
| `app/components/StepScreen.vue` | `app/pages/[game]/index.vue` | `emit open-warning-detail` / `open-option-detail` | ✓ WIRED | Confirmado, un único `activeDetail` unifica ambos disparadores (DC-15) |
| `content/marvel-champions.json` | `engine/resolve.ts` | `resolveText` fusiona `options`/`optionsWarning` con `??` | ✓ WIRED | Leído `resolve.ts` completo, patrón correcto |

### Cobertura de requisitos

| Requisito | Plan de origen | Descripción | Estado | Evidencia |
|---|---|---|---|---|
| FLOW-03 | 02-01 | Al avanzar desde el último paso de la ronda, vuelve al primer paso de la ronda | ✓ SATISFIED | `navigator.test.ts` sobre contenido real |
| FLOW-04 | 02-01, 02-02 | El contador de ronda se incrementa al cerrar el ciclo | ✓ SATISFIED | ídem + `header.test.ts` |
| FLOW-07 | 02-01, 02-02 | Tras saltar a un paso del bucle, seguir avanzando continúa correctamente | ✓ SATISFIED | `navigator.test.ts:194-212` |
| FLOW-08 | 02-01, 02-02 | Saltar a preparación no rompe el contador de ronda | ✓ SATISFIED (caso principal) / ⚠ ver WR-06 | `jumpTo` no toca `round` (confirmado); pero la ronda retenida desaparece de todas las superficies visuales tras el salto — ver hallazgo WR-06 abajo, no niega FLOW-08 en sí (el contador no se rompe, solo deja de mostrarse) |
| CONT-02 | 02-01, 02-04 | Fase de jugadores con orden correcto de fin de fase | ✓ SATISFIED | Confirmado en JSON + `02-CONTENT-REVIEW.md` |
| CONT-03 | 02-01, 02-04 | Fase del villano con 6 pasos oficiales | ✓ SATISFIED | ídem |
| CONT-04 | 02-01, 02-04 | Fin de ronda, incluida la ficha de jugador inicial | ✓ SATISFIED | `ronda.villano.05`/`.06` |
| CONT-05 | 02-01, 02-03, 02-04, 02-05 | Agotamiento de mazo de jugador y de encuentros, casos distintos | ✓ SATISFIED | `warningDetail` distintos confirmados |
| CONT-06 | 02-01, 02-03, 02-04 | Cambio de fase del villano al agotarse la vida | ✓ SATISFIED | `ronda.jugadores.01.warningDetail` |
| CONT-07 | 02-01, 02-03, 02-04, 02-05 | Estados Aturdido/Confundido/Duro con su resolución | ✓ SATISFIED | `ronda.villano.02.warning`/`optionsWarning` gemelo |
| CONT-09 | 02-01, 02-03, 02-04, 02-05 | Contenido verificado contra RR v1.7 antes de definitivo | ✓ SATISFIED (proceso humano) | Cadena completa en `02-CONTENT-REVIEW.md`: revisión → veredicto con C1/C2 → capacidad construida → aprobación incondicional final. Ver nota CR-01 sobre el gate automático |
| ADAPT-04 | 02-01, 02-04 | Ramas Héroe/Alter-Ego como texto simultáneo | ✓ SATISFIED | `ronda.villano.02.text`, D-33 |
| UI-09 | 02-03, 02-05 | Aviso ⚠ y opciones del turno tocables, cierran sin perder posición | ✓ SATISFIED (funcional) / ver hallazgo humano | Verificado en código; el cierre nunca toca `cursor`/`round`. El foco de teclado no se restaura correctamente en WebKit (ver abajo) — no invalida la posición/ronda, sí el contrato de accesibilidad de `02-UI-SPEC.md` |

No hay requisitos huérfanos: los 13 IDs de la línea `**Requirements**` de la Fase 2 en `ROADMAP.md` aparecen en el `requirements:` de al menos un plan.

### Anti-patrones encontrados (confirmados por mí, no solo heredados de `02-REVIEW.md`)

| Archivo | Línea | Patrón | Severidad | Impacto |
|---|---|---|---|---|
| `engine/schema.ts` (los 6 `z.object()`) | 12-89 | Esquema en modo *strip*, no *reject* | ⚠ Warning | Un campo desconocido o mal escrito pasa el gate de CI en silencio; verificado por mí con probe reproducible independiente (ver resumen ejecutivo) |
| `app/composables/useGameContent.ts` | 9-13 | Sirve JSON crudo al navegador, nunca pasa por Zod | ⚠ Warning | Objeto validado ≠ objeto servido; agrava el punto anterior |
| `engine/schema.ts` | 137-146 | Duplicidad de `label` en `options` no se comprueba en variantes de dificultad | ⚠ Warning | No alcanzable con el contenido actual (ningún paso de ronda declara `variants.difficulty`, confirmado) |
| `app/components/WarningDetailModal.vue` | 30-58 | `aria-modal="true"` sin focus-trap ni `inert` en el fondo | ⚠ Warning | Ver ítem de verificación humana abajo |
| `app/pages/[game]/index.vue` | 131-153 | Disparador del modal capturado con `document.activeElement` | ⚠ Warning | Falla en iPad Safari (los `<button>` no retienen foco al toque); ver ítem de verificación humana |
| `engine/persistence.ts` / `usePersistedSession.ts` | — | `round` restaurado de `localStorage` sin validar tipo/rango | ⚠ Warning | Confirmado leyendo el código: solo se comprueba presencia de la clave, no `typeof === 'number'` |
| `engine/toc.ts` / `IndexOverlay.vue` | 26-30, 87 | `TocBlock` no expone id estable; `IndexOverlay` clave por `label` | ⚠ Warning | Confirmado; no alcanzable hoy (9 títulos de fase distintos, verificado) |
| `engine/header.ts` / `toc.ts` | 67-75, 48-50 | La ronda retenida desaparece de cabecera/índice/resumen de reanudación al saltar fuera del bucle | ⚠ Warning | Confirmado leyendo `savedSummary` en `index.vue`: se compone de `sectionLabel`+`position`+`sessionContextLabel`, ninguno de los cuales muestra la ronda fuera del bucle |
| `header.test.ts` / `toc.test.ts` | — | Ningún test compone `next()`/`prev()` reales con `describeHeader`/`tableOfContents` | ℹ️ Info | Gap de cobertura, no bug en producción; confirmado que ningún test importa `next`/`prev` en esos dos ficheros |

Ninguno de estos hallazgos es un `TBD`/`FIXME`/`XXX` sin referencia — son hallazgos de calidad de una revisión de código, no deuda marcada y abandonada. No se aplica el gate de marcador de deuda.

### Verificación de comportamiento (spot-checks)

| Comportamiento | Comando | Resultado | Estado |
|---|---|---|---|
| Suite de tests completa | `npx vitest run` | 133/133 verde, 7 ficheros | ✓ PASS |
| Build de producción | `npx nuxt build` | Completo, 0 errores, prerender de ambas rutas | ✓ PASS |
| Gate D-37 (probe manual) | inyectar `branches` en copia de `ronda.villano.02` + `validateGameDefinition` vía `vite-node` | Validación pasa, `branches` queda `undefined` en el objeto validado | ✓ PASS (confirma CR-01, no una regresión de esta verificación) |

### Requerido verificación humana

### 1. Comportamiento del modal de detalle en un iPad real (foco de teclado)

**Test:** Abrir el modal de detalle de una opción o de un aviso `⚠`, y con un teclado externo (o VoiceOver) intentar tabular hacia `SIGUIENTE`/`≡` mientras el modal sigue abierto; después cerrar el modal y comprobar dónde queda el foco.
**Esperado:** El modal debería impedir que el foco salga de él (focus-trap) o el fondo debería marcarse `inert`; al cerrar, el foco debería volver al botón que abrió el panel.
**Por qué humano:** El código (confirmado por mí leyendo `WarningDetailModal.vue` y `app/pages/[game]/index.vue`) no implementa focus-trap y captura el disparador con `document.activeElement`, que en Safari/WebKit es `<body>` tras un toque (los botones no retienen foco al tap en ese motor). Ningún test de esta fase ejerce esta ruta porque ninguno usa un motor WebKit real, y ningún playtest documentado en `02-CONTENT-REVIEW.md` menciona un iPad físico ni un teclado externo — los playtests se hicieron con `npm run dev`, lo que en la práctica documentada de este proyecto apunta a un navegador de escritorio, donde el foco de botón sí se retiene y el bug no se manifiesta. Esto no se puede verificar con grep ni con Vitest en jsdom; requiere el dispositivo objetivo real o un lector de accesibilidad.

*(No se re-archivan aquí los recorridos que el usuario ya verificó en el checkpoint de `02-05`: las seis opciones y sus modales, la línea de Estados siempre visible, el cierre del modal por botón/velo/Escape en el flujo táctil normal, el avance de ronda completo, y el aviso de contenido cambiado al reanudar. Tampoco se re-archivan los tres recorridos manuales de `02-03` — el aviso con borde/chevron en `ronda.villano.02`, el cierre en sus tres vías, y la ausencia de afordancia en `ronda.villano.01` — porque considero que quedaron cubiertos por la partida completa jugada en `02-04` Parte B, que el propio dossier dice haber comprobado "los 5 modales de aviso con consecuencia" en partida real, lo que necesariamente incluye abrir y cerrar el de `ronda.villano.02` y pasar visualmente por el paso sin afordancia de `ronda.villano.01`.)*

### Resumen de brechas

No hay brechas que bloqueen el objetivo de la fase. Los 7 criterios de éxito del roadmap están verificados como verdaderos en el código actual, con `133/133` tests en verde y un build de producción limpio, ambos ejecutados por mí en esta verificación. El hallazgo Crítico de `02-REVIEW.md` (CR-01) lo he confirmado de forma independiente y es real, pero afecta a la solidez del gate automático de cara al contenido *futuro*, no a la corrección del contenido *ya revisado y aprobado por el usuario* en esta fase — por eso no lo elevo a bloqueante del objetivo de esta fase, aunque recomiendo resolverlo antes de que la Fase 3 o el contenido de Warhammer 40.000 añadan pasos nuevos. Las siete advertencias de `02-REVIEW.md` (WR-01 a WR-07) las he verificado yo mismo leyendo el código señalado, no heredado del informe: todas son reales, ninguna es alcanzable con el contenido/uso actual salvo la de foco en iPad (WR-02/WR-03), que sí es plausible con el dispositivo objetivo del proyecto y no tiene ningún playtest documentado que la descarte — de ahí el único ítem de verificación humana de este informe.

---

*Verificado: 2026-08-30T00:20:00Z*
*Verifier: Claude (gsd-verifier)*
