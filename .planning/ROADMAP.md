# Roadmap: TableGameAssistant

## Overview

Cuatro fases, cada una entregando algo jugable de verdad, no una capa técnica aislada. La Fase 1 construye el motor de flujo (puro, testeado) a la vez que autoriza y verifica el contenido de la preparación de mesa de Marvel Champions, y lo pone en una tablet real, en texto, sin voz ni offline: el riesgo nº1 del proyecto es la fidelidad de las reglas, y una prueba de mesa temprana es la forma más rápida de detectar tanto reglas mal contadas como pasos mal cortados. La Fase 2 completa el bucle de ronda (fase de jugadores, fase del villano con sus 6 pasos oficiales, fin de ronda) con el contenido corregido y verificado contra el Rules Reference v1.7, dejando jugable una partida entera de principio a fin. Las Fases 3 y 4 añaden, como capas progresivas que nunca bloquean el botón «Siguiente», la locución por voz + pantalla siempre encendida, y por último la instalación offline como PWA. El esquema de contenido (citas de reglamento y frase corta locutable) se diseña completo desde la Fase 1, aunque la voz no se conecte hasta la Fase 3 — retro-adaptarlo después sería caro.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Motor de flujo, selector y preparación de mesa** - El grupo elige Marvel Champions, configura la partida y recorre toda la preparación de mesa en una tablet real, con contenido verificado y la app desplegada en una URL.
- [ ] **Phase 2: Bucle de ronda y reglas verificadas** - El grupo juega ronda tras ronda —fase de jugadores, fase del villano (6 pasos oficiales), fin de ronda— con el contenido corregido contra el Rules Reference v1.7.
- [ ] **Phase 3: Locución por voz y pantalla siempre encendida** - El grupo escucha cada paso en voz alta en español y la tablet no se apaga durante la partida, sin que ninguna de las dos cosas bloquee el flujo si falla.
- [ ] **Phase 4: Instalación y funcionamiento offline** - El grupo instala la app en la tablet y juega una partida completa aunque se caiga la wifi a mitad de partida.

## Phase Details

### Phase 1: Motor de flujo, selector y preparación de mesa
**Goal**: Un grupo puede abrir la app en una tablet, elegir Marvel Champions (viendo Warhammer 40.000 bloqueado como «Próximamente»), indicar nº de jugadores y dificultad en una sola pantalla, y recorrer paso a paso —con «Siguiente»/«Atrás», cabecera de orientación y salto a cualquier paso— toda la preparación de mesa, con el progreso persistido y el contenido verificado contra el reglamento oficial, en una interfaz tablet-first desplegada en una URL real.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: SEL-01, SEL-02, SEL-03, SEL-04, SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, FLOW-01, FLOW-02, FLOW-05, FLOW-06, CONT-01, CONT-08, CONT-10, CONT-11, ADAPT-01, ADAPT-02, ADAPT-03, UI-01, UI-02, UI-03, UI-04, UI-05, PERS-01, PERS-02, PERS-03, TECH-01, TECH-02, TECH-03, TECH-04, TECH-05
**Success Criteria** (what must be TRUE):
  1. Al abrir la web, el usuario ve el selector de juego, puede elegir Marvel Champions, y ve Warhammer 40.000 marcado como «Próximamente» sin poder entrar.
  2. En una sola pantalla el usuario indica jugadores y dificultad y pasa directamente al primer paso de la preparación; si existe una partida guardada, la app pregunta explícitamente si continuar o empezar una nueva (nunca reanuda en silencio).
  3. El usuario avanza y retrocede por todos los pasos de la preparación de mesa con «Siguiente»/«Atrás» (el más prominente de la pantalla), ve en todo momento una cabecera con fase y posición actuales, y puede abrir un índice y saltar directamente a cualquier paso.
  4. El texto de cada paso se adapta al nº real de jugadores y a la dificultad elegida, muestra tal cual las fórmulas de cantidades (sin resolver la aritmética), es legible a un brazo de distancia en tema oscuro con controles de tamaño táctil adecuado, y cada paso que enuncia una regla cita su origen en el Rules Reference v1.7 con una redacción propia, breve e imperativa (sin copiar texto del reglamento).
  5. Al recargar la página o desbloquear la tablet, el usuario recupera exactamente el mismo paso; si el contenido cambió desde que se guardó, la app no reanuda en un paso incorrecto. La lógica del motor (incluido el cierre del bucle, el salto entre pasos y la reanudación con contenido desactualizado) está cubierta por tests automáticos, un fichero de contenido mal formado hace fallar la validación en CI, y la app está publicada en una URL accesible desde la tablet.
**Plans**: 8 plans
Plans (en orden de ejecución; los planes 01-07 y 01-08 son posteriores en numeración pero anteriores en ejecución — la verdad es `wave`/`depends_on`, no el número de fichero):
- [x] 01-01-PLAN.md — (ola 1) Esqueleto 1/3: scaffold Nuxt 4 SSG, tokens tablet-first, guardia de orientación y gates de CI/despliegue
- [x] 01-07-PLAN.md — (ola 2) Esqueleto 2/3: motor de flujo puro con tests, esquema Zod en CI y primer contenido real citado
- [x] 01-08-PLAN.md — (ola 3) Esqueleto 3/3: composables, las tres bandas de la UI y el primer paso navegable con SIGUIENTE/Atrás
- [x] 01-02-PLAN.md — (ola 4) Selector de juego y mini-setup de una pantalla, con el contexto de partida en la cabecera
- [ ] 01-03-PLAN.md — (ola 4) Contenido verificado de la preparación: 21 pasos citados, avisos, variantes de dificultad y gate de CI
- [ ] 01-04-PLAN.md — (ola 5) Persistencia y reanudación explícita: nunca en silencio, nunca en un paso incorrecto
- [ ] 01-05-PLAN.md — (ola 6) Índice de salto agrupado por bloques y pantalla «Mesa lista»
- [ ] 01-06-PLAN.md — (ola 7) Reverificación del contenido, prueba de flujo completo (D-04) y despliegue conjunto a Netlify
**UI hint**: yes

### Phase 2: Bucle de ronda y reglas verificadas
**Goal**: Un grupo puede jugar una partida completa de Marvel Champions de principio a fin: tras la preparación, la fase de los jugadores, la fase del villano (con sus 6 pasos oficiales) y el fin de ronda se encadenan en un bucle que vuelve solo al punto correcto, ronda tras ronda, con el contenido corregido y verificado contra los errores ya detectados en el borrador.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: FLOW-03, FLOW-04, FLOW-07, FLOW-08, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, CONT-07, CONT-09, ADAPT-04
**Success Criteria** (what must be TRUE):
  1. El usuario completa la fase de los jugadores en el orden correcto (descartar, robar, preparar) y recorre la fase del villano con sus 6 pasos oficiales, en el orden del reglamento (no los 4 del borrador original).
  2. Al avanzar desde el último paso de la ronda, el usuario vuelve al primer paso de la fase de jugadores (no a la preparación) y el contador de ronda se incrementa; tras saltar a un paso del bucle desde el índice, seguir avanzando continúa correctamente por el bucle, y un salto a un paso de la preparación no toca el contador de ronda.
  3. El usuario ve, en el momento en que aplican, el agotamiento del mazo de jugador y el del mazo de encuentros como casos distintos con sus consecuencias correctas, el cambio de fase del villano al agotarse su vida, y los estados Aturdido/Confundido/Duro con su resolución correcta.
  4. En los pasos con ramas Héroe/Alter-Ego, el usuario ve ambas ramas como texto simultáneamente, sin necesidad de ningún toque para elegir.
  5. Todo el contenido de la ronda queda verificado contra el Rules Reference v1.7 antes de darse por definitivo, incluidas las correcciones ya confirmadas: 6 pasos oficiales de la fase del villano, obligaciones «una o más por identidad» (no una por jugador), solo el villano y los esbirros con la palabra clave Villano roban cartas de aumento, y el Modo Experto no altera la estructura de la fase del villano (eso es el Modo Heroico, un eje aparte).
**Plans**: TBD

### Phase 3: Locución por voz y pantalla siempre encendida
**Goal**: Un grupo puede jugar escuchando cada paso en voz alta, en español, con una frase corta y curada distinta del texto en pantalla, y la tablet permanece encendida durante toda la partida; si la voz o el bloqueo de pantalla fallan o no están disponibles, el flujo guiado sigue funcionando con normalidad.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: VOZ-01, VOZ-02, VOZ-03, VOZ-04, VOZ-05, VOZ-06, UI-06, UI-07, UI-08
**Success Criteria** (what must be TRUE):
  1. Al llegar a cada paso, el usuario escucha una frase corta y curada (no el texto completo mostrado en pantalla); puede silenciar y reactivar la voz desde un control siempre visible, y esa preferencia se conserva entre pasos y entre sesiones.
  2. Al navegar (siguiente, atrás o salto), cualquier locución en curso se corta antes de empezar la nueva; las locuciones nunca se encolan ni se repiten.
  3. Si el dispositivo no tiene voz en español, o la síntesis no está disponible o falla, la app lo indica o simplemente no habla, y el flujo guiado sigue siendo plenamente utilizable solo con texto.
  4. La pantalla no se apaga mientras hay una partida en curso y el usuario sabe que eso consume batería; si el bloqueo de pantalla no está disponible en el dispositivo, la app sigue funcionando con normalidad.
**Plans**: TBD
**UI hint**: yes

### Phase 4: Instalación y funcionamiento offline
**Goal**: Un grupo puede instalar la app en la tablet, abrirla a pantalla completa, y jugar una partida entera aunque la wifi se caiga a mitad de partida; cuando se publica una versión nueva, la app espera la decisión del usuario en vez de recargarse sola.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: OFF-01, OFF-02, OFF-03, OFF-04
**Success Criteria** (what must be TRUE):
  1. El usuario puede instalar la app en la tablet y abrirla a pantalla completa, sin barra del navegador.
  2. Con la app visitada una vez, el flujo completo (selector, mini-setup, preparación y bucle de ronda, con voz y sin ella) funciona sin conexión a internet.
  3. Si la conexión se cae a mitad de partida, la app sigue funcionando sin interrupción.
  4. Cuando hay una versión nueva publicada, la app avisa y espera la decisión del usuario; nunca se recarga sola a mitad de ronda.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Motor de flujo, selector y preparación de mesa | 4/8 | In Progress|  |
| 2. Bucle de ronda y reglas verificadas | 0/TBD | Not started | - |
| 3. Locución por voz y pantalla siempre encendida | 0/TBD | Not started | - |
| 4. Instalación y funcionamiento offline | 0/TBD | Not started | - |
