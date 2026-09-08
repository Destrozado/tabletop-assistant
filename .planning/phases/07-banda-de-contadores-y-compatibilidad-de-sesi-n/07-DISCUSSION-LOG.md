# Phase 7: Banda de contadores y compatibilidad de sesión - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-08
**Phase:** 7-Banda de contadores y compatibilidad de sesión
**Areas discussed:** Presupuesto y anatomía de la banda, Cuándo se ve la banda, Precarga/etapas/cambios a media partida, Gestos del contador

---

## Presupuesto y anatomía de la banda

### Anatomía de la celda

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| `▼ número ▲` en una línea, etiqueta encima | h-24 (96px) = 12,5% de 768px, 22px de margen. Número a text-display (40px). Flechas pulsables en los 96px completos. | ✓ |
| Número arriba, ▼▲ como medias celdas debajo | h-28 (112px) = 14,6%, sin margen. Botones más anchos (~100px) pero de solo 48px de alto. | |
| Todo en una línea sin etiqueta aparte | h-20 (80px) = 10,4%. El nombre compite con la cifra en el mismo renglón. | |

**Notas:** recomendada la elegida. Cifras medidas del repo real: `AppHeader` h-16, `NavBand` h-24, escala `display 40 / heading 28 / body 20 / label 18`.

### Posición en la pila

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Arriba, bajo la cabecera | Separa los ▼/▲ del botón SIGUIENTE (65% del ancho de NavBand). PITFALLS §13. | ✓ |
| Abajo, encima de NavBand | Contadores y navegación juntos, al precio de un ▼ a 0px de SIGUIENTE. | |

### Etiqueta de la celda de jugador

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Nombre del jugador | Vacío → «Jugador N», misma constante de 14 caracteres de D-15 de la Fase 6. Cabe siempre. | ✓ |
| «Ana · Thor», truncado si no cabe | Con 4 jugadores «Carla · Bruja Escarlata» (21 car.) se trunca. | |
| Nombre del héroe | Sin selección quedarían cuatro etiquetas vacías idénticas. | |

### Comportamiento en ancho estrecho

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Una sola fila siempre; el número encoge a 28px | Presupuesto de 96px inviolable en cualquier viewport, un solo layout. **Recomendada por Claude.** | |
| Dos filas: villano arriba, jugadores abajo | Número a 40px en cualquier ancho; 192px = 25% del alto en viewport estrecho. | ✓ |
| La banda se oculta bajo cierto ancho | Haría imposible la verificación humana, que se hace en viewport simulado. | |

**Notas:** el usuario eligió contra la recomendación. Consecuencia detectada y cerrada en la pregunta siguiente.

### Interpretación del presupuesto de HP-02 (pregunta de seguimiento)

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Se mide solo en tablet apaisada | HP-02 dice «verificado en el viewport objetivo»; los 192px en estrecho son decisión, no incumplimiento. | ✓ |
| Vale en todos los viewports: dos filas de h-12 | Respeta el 15% en cualquier ancho, al precio de número a 20px y flechas de 48px. | |

---

## Cuándo se ve la banda

### Momento de aparición

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Solo en la sección que repite (la ronda) | Derivado de `section.repeats === true`, nunca del id `ronda` (D-24 Fase 2, D-02 Fase 6). Toda la preparación conserva el alto íntegro. | ✓ |
| Desde el final del setup hacia adelante | Exigiría una marca nueva en los datos para no cablear `setup.mesa-lista`. | |
| Siempre, desde el primer paso | Lectura literal de HP-01, pero roba 96px en los pasos de texto más largo y con celdas vacías. | |

### ¿Plegable?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| No: fija, sin control de ocultar | El problema de espacio de PITFALLS §4 ya lo resuelve la decisión anterior. Cero controles nuevos en la cabecera (D-18 Fase 6). | ✓ |
| Sí: un tirador la pliega a una línea fina | Recupera 96px, al precio de un estado que persistir y una afordancia que explicar. | |

---

## Precarga, etapas del villano y cambios a media partida

### Relación entre valor guardado y valor calculado

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| `null` hasta el primer toque; se pinta el valor calculado en vivo | Resuelve gratis el diferido de la Fase 6; sin instante mágico de precarga que pueda perderse. | ✓ |
| Calcular y guardar al entrar en la primera ronda | Un contador siempre es número, nunca null — pero exige decidir aparte el cambio de héroe y el retroceso al setup. | |
| Calcular y guardar al elegir en el setup | Escribe contadores en pasos donde no hay contadores a la vista; mismo problema pendiente. | |

### Contador ya tocado + cambio de héroe a media ronda

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Se queda con la cifra tocada, sin avisar | El caso real es corregir una etiqueta mal puesta; recalcular borraría el daño recibido. El caso benigno ya lo cubre el modelo `null`. | ✓ |
| Vuelve a `null` y recalcula | Correcto si reconfiguran la partida, destructivo si corrigen una etiqueta — la app no distingue. | |
| Se pregunta con un diálogo | No pierde información, pero D-13 de la Fase 6 eliminó a propósito todo lo que hubiera que confirmar. | |

### Etapas del villano

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| No: la precarga es la etapa I y ya | Ningún requisito menciona etapas; PITFALLS §14. El catálogo ya guarda las tres para el día que se quiera. | ✓ |
| Un control de etapa que recarga el contador | Útil (subir de 0 a 51 con ▲ es absurdo) pero es una tercera cosa dentro de 96px y un estado nuevo que persistir. | |
| Automático al llegar a 0 | El contador cambiaría solo bajo los dedos del grupo; en etapa III el 0 sí es final. | |

### Celda sin valor conocido

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| «—», ▲ arranca en 1, ▼ no hace nada | Mismo símbolo que la rejilla de la Fase 6. «—» no es 0, así que nadie sale marcado «SIN VIDA» de entrada. | ✓ |
| «—» con flechas inertes hasta elegir | Convertiría la selección en requisito de hecho, contra SEL-09. | |
| 0 desde el principio | Un solo tipo de dato, pero arrancaría marcando a los cuatro jugadores como derrotados (HP-06). | |

---

## Gestos del contador

### Mantener pulsado

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| No: un toque = ±1 | Cumple HP-10 sin repetición que pueda descontrolarse; elimina de raíz todo PITFALLS §13. | ✓ |
| Repetición con tope duro (500ms/150ms/30 pasos) | Ahorra toques, pero el bug del dedo deslizado solo aparece en dispositivo táctil real, que esta fase no puede probar. | |
| Toque = ±1, pulsación larga = ±5 | Sin intervalo, pero D-17 de la Fase 6 descartó la pulsación larga por invisible. | |

### Marca visual a 0 (HP-06/HP-07)

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| La etiqueta pasa a «ANA · SIN VIDA» en `text-warning` | Reutiliza el renglón de etiqueta: cero altura extra. ▲ vuelve a subir y la etiqueta vuelve al nombre. | ✓ |
| Solo el 0 en color de aviso | Más discreto, pero a un brazo de distancia un 0 naranja es una señal débil. | |
| Celda entera con fondo de aviso | Imposible de pasar por alto, pero compite visualmente con el texto grande del paso. | |

### Palabra exacta (pregunta de seguimiento — la app no sabe el género)

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| «SIN VIDA» | Sin género, 8 caracteres, describe el estado del contador y no a la persona. Un solo literal. | ✓ |
| «DERROTADO» invariable | Término del reglamento y palabra literal de HP-06, pero se lee como error para media mesa. | |
| «K.O.» | Lo más corto y sin género, pero rompe el registro del español de las cartas. | |

### Teclado

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Los contadores no se operan con teclado, y se documenta | Espacio/Enter/← idénticos a v1.7 (HP-09); `shortcutsEnabled` sin una rama más. Comentario + test para que se lea como decisión (PITFALLS §13). | ✓ |
| ↑/↓ ajustan el contador enfocado | Ampliaría `useStepShortcuts` con una noción de foco que no existe, en una app táctil sin teclado. | |

### Deshacer

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Nada más: ▲ deshace ▼ | La operación inversa es el otro botón, a un toque y siempre visible. El estado de pulsado de NavBand ya confirma el toque. | ✓ |
| Además, el número destella al cambiar | Refuerza «esto sí registró», al precio de una animación que no existe en ningún otro sitio. | |
| Además, pulsación larga vuelve al precargado | Sugerencia literal de PITFALLS §13; choca con D-17 de la Fase 6 y con la decisión de no usar mantener-pulsado. | |

---

## Área no discutida (capturada con el acuerdo explícito del usuario)

**COMP-01 / COMP-02.** Presentada resuelta y aceptada sin discusión: `counters` entra como
campo opcional igual que `selection`, sin bumpear `formatVersion` (hereda D-19 de la Fase 6),
y el criterio de éxito nº 5 del roadmap se cierra con un test que construye a mano una sesión
persistida de v1.7 y comprueba que `resume()` la devuelve utilizable y que la banda se pinta
con «—» sin ningún `undefined` llegando a la interfaz. Ver D-19..D-22 de CONTEXT.md.

## Claude's Discretion

Ninguna decisión fue delegada con un «tú decides». Los puntos abiertos que quedan a criterio
de research/planning están enumerados en `<decisions>` §«Claude's Discretion» de CONTEXT.md
(forma exacta de `counters`, dónde vive el cálculo, nombre del componente, umbral del ancho
estrecho, cómo se deriva «la sección repite», normalización defensiva, y si merece la pena
`/gsd:ui-phase 7`).

## Deferred Ideas

- Control de etapa del villano (el dato ya existe en el catálogo desde la Fase 5).
- Repetición al mantener pulsado — solo reconsiderable con una tablet identificada donde probarla.
- Deshacer extra, destello de confirmación, pulsación larga para reiniciar.
- Contador de amenaza y fichas de estado — exclusión permanente, no diferido.
- Operar los contadores con teclado — decisión, no aplazamiento.
- Corregir el «37 clips» de PROJECT.md y del archivo de v1.7 (el real son 35).
