# Phase 3: Locución por voz y pantalla siempre encendida - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-30
**Phase:** 3-locucion-por-voz-y-pantalla-siempre-encendida
**Areas discussed:** Contenido locutado, Cuándo habla y cuándo calla, Control de silencio, Sin voz y batería

---

## Contenido locutado

**Pregunta 1 — Los 10 pasos de la ronda ya tienen frase locutable; los 23 de la preparación no tienen ninguna. ¿Cómo se cubre ese hueco?**

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Autorar los 24 a mano | Frase corta por paso + gate de CI exigiendo `speech` en todo `kind:'step'` | ✓ |
| Fallback automático al texto de pantalla | Locutar `text` si falta `speech`; contradice VOZ-01 y tapa los huecos | |
| Mixto: autorar solo donde haga falta | Reutilizar `text` cuando ya es corto; el gate no puede morder uniformemente | |

**Notas:** el recuento correcto son 23 pasos + 1 pantalla de repaso, corregido durante la discusión. → D-38

**Pregunta 2 — ¿La voz menciona el aviso `⚠` o lo calla?**

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Solo la acción; el `⚠` no se locuta | Locución de una frase; el recordatorio se queda en pantalla | ✓ |
| Acción + aviso en una sola locución | Llega también a quien no mira; obligaría a reescribir las 10 frases de la ronda | |
| El autor decide por paso | Campo opcional nuevo; máxima precisión, más esquema | |

**Notas:** se aceptó conscientemente que quien no mire la tablet no oiga el recordatorio. → D-39

**Pregunta 3 — ¿Hablan las pantallas que no son pasos?**

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Solo los pasos `kind:'step'` | Selector, mini-setup, reanudación y «Mesa lista» quedan mudos | ✓ |
| Los pasos y además «Mesa lista» | Frase corta de arranque; requiere `speech` en un nodo `kind:'summary'` | |
| Los pasos y la lista de repaso completa | 7 líneas locutadas; la locución larga que el proyecto evita | |

**Notas:** → D-40

**Pregunta 4 — ¿Cómo se evita que la voz contradiga a la pantalla en pasos con variante?**

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| El gate de CI exige `speech` en cada variante | Rompe el build si falta; hoy son 4 frases más | ✓ |
| Regla de autoría, sin gate | Se documenta y se revisa a mano | |
| Sin `speech` en la variante, no se locuta | Seguro pero deja huecos mudos silenciosos | |

**Notas:** el riesgo se descubrió escaneando el contenido — `setup.encuentros.03` y `setup.escenario.04` tienen variantes cuyo texto contradice al base, y `engine/resolve.ts:15` haría caer la locución en la frase base. → D-41

---

## Cuándo habla y cuándo calla

**Pregunta 1 — ¿Dónde se dispara la locución, dado que iOS descarta `speak()` fuera del gesto del usuario?**

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Dentro del propio manejador del toque | Síncrono, en los mismos handlers que llaman a `next()`/`prev()`/`jumpTo()` | ✓ |
| Un `watch` sobre el paso actual | Un solo punto y más limpio, pero muerto en el iPad objetivo | |
| Ambos según plataforma | Dos rutas que mantener y probar | |

**Notas:** → D-42

**Pregunta 2 — ¿Se locuta el paso al reanudar una partida guardada?**

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Sí, «Continuar» locuta el paso recuperado | Es un toque, funciona en iPad; útil al volver de un bloqueo | ✓ |
| No: la voz empieza en el siguiente toque de navegación | Más silencioso, pero muda hasta que alguien avance | |
| Sí, y también al entrar al primer paso desde el mini-setup | Regla única sin excepciones; la app habla en más momentos | |

**Notas:** → D-43

**Pregunta 3 — ¿Hay forma de repetir la frase?**

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| No hay botón de repetir | El texto en pantalla es la fuente de verdad | ✓ |
| Tocar el texto del paso lo repite | Afordancia de toque invisible; choca con D-32 | |
| Botón de repetir junto al de silencio | Descubrible, pero ningún requisito lo pide | |

**Notas:** → D-44, y anotado como idea aplazada por si en mesa hace falta

**Pregunta 4 (multiselección) — ¿En qué otros momentos se corta una locución en curso?**

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Al silenciar (corte inmediato) | No deja terminar la frase | ✓ |
| Al abrir el modal de detalle | La voz de fondo compite con la lectura | |
| Al abrir el índice de salto | El overlay tapa el paso que se está locutando | |
| Al ocultarse o bloquearse la tablet | Que no siga hablando sola junto a la mesa | ✓ |

**Notas:** el índice y el modal **no** cortan: la frase es corta y termina sola. → D-45

---

## Control de silencio

**Pregunta 1 — ¿Dónde vive la preferencia de voz, sabiendo que «Empezar partida nueva» borra el estado guardado entero?**

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Clave propia, independiente de la partida | Sobrevive a partida nueva, borrado y cambio de juego | ✓ |
| Dentro del estado de la partida guardada | Una sola clave, pero la voz vuelve sola en cada partida nueva | |
| No se persiste | Incumple VOZ-03 | |

**Notas:** → D-46

**Pregunta 2 — ¿Voz activada o silenciada por defecto la primera vez?**

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Activada | Es el diferenciador de la fase; si arranca muda nadie la descubre | ✓ |
| Silenciada | Nada suena sin pedirlo, pero esconde la función estrella | |

**Notas:** → D-47

**Pregunta 3 — ¿Qué forma toma el control?**

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Icono en la cabecera, junto al índice | El hueco ya está reservado en `AppHeader.vue` para esta fase | ✓ |
| En la banda inferior, junto a Atrás/SIGUIENTE | Más a mano, pero rompe la banda de un solo botón prominente | |
| Interruptor con etiqueta de texto | Sin ambigüedad, pero ocupa ancho en una cabecera ya cargada | |

**Notas:** → D-48

**Pregunta 4 — ¿En qué pantallas aparece el control?**

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Solo en las pantallas de paso | El control vive donde vive la voz | ✓ |
| También en «Mesa lista» | Permite silenciar antes de arrancar; hoy no tiene cabecera | |
| En todas las pantallas del juego | Regla única, pero aparece donde nunca sonará nada | |

**Notas:** → D-49

---

## Sin voz y batería

**Pregunta 1 — ¿Cómo se comunica que no hay voz en español (VOZ-05)?**

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Aviso una sola vez, descartable | Explica qué hacer (Ajustes → Idiomas → Texto a voz) y no vuelve | ✓ |
| El icono refleja el estado, sin aviso | Cero interrupciones, pero nadie sabe por qué no habla | |
| Aviso una vez + icono en estado no disponible | Lo más claro; más trabajo de UI | |

**Notas:** en Android sin paquete de voz, Chrome no falla — cae en silencio a una voz inglesa. → D-50

**Pregunta 2 — ¿Cuál es el alcance del bloqueo de pantalla?**

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Solo con partida en curso, re-pidiendo al volver a primer plano | Literalmente lo que pide UI-06 | ✓ |
| Desde que se abre la app hasta cerrarla | Una sola llamada, pero gasta batería sin partida | |
| Un control manual para el usuario | Un botón más que ningún requisito pide | |

**Notas:** → D-51

**Pregunta 3 — ¿Dónde y cuándo se avisa del coste de batería (UI-07)?**

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Línea fija en el mini-setup, antes de empezar | Se lee sin prisa, no interrumpe, sin estado «ya lo vio» | ✓ |
| Aviso descartable una sola vez | Imposible no verlo, pero toque extra y estado nuevo | |
| Icono permanente en la cabecera | Ocupa sitio para algo que solo importa una vez | |

**Notas:** → D-52

**Pregunta 4 — ¿Cómo se da la fase por buena, si ni la voz ni el wake lock son testeables con Vitest?**

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Lógica pura testeada + prueba humana en la tablet | Mismo dispositivo de D-36, que cazó los errores reales de las Fases 1 y 2 | ✓ |
| Añadir Playwright en esta fase | STACK.md lo difiere; no comprueba que se oiga en el iPad | |
| Solo prueba manual | Deja sin red la parte que sí es determinista | |

**Notas:** → D-53

---

## Claude's Discretion

El usuario no delegó ninguna decisión de forma explícita. Lo que queda abierto para research/planner está listado en la sección homónima de `03-CONTEXT.md`: redacción de las 23+4 frases, iconografía y estados del control de voz, ubicación del composable, detección fiable de «no hay voz en español», mecanismo compartido de visibilidad para el corte de voz y el re-pedido del wake lock, y alcance exacto de los tests.

## Deferred Ideas

- Botón o gesto para repetir la locución
- Locutar también el aviso `⚠`
- Locutar «Mesa lista» y su lista de repaso
- Selector de voz, velocidad o volumen
- Playwright para humo de PWA/voz (encaje natural: Fase 4)
- Control manual del bloqueo de pantalla
- Aviso de descargar el paquete de voz con conexión antes de jugar sin wifi (Fase 4)
