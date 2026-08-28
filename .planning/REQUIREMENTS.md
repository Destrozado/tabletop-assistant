# Requirements: TableGameAssistant

**Defined:** 2026-08-28
**Core Value:** Que un grupo pueda jugar una partida completa de Marvel Champions de principio a fin sin abrir el reglamento y sin olvidarse de ningún paso.

## v1 Requirements

Requisitos de la primera versión. Cada uno se mapea a una fase del roadmap.

### Selector de juego

- [ ] **SEL-01**: Al abrir la web, el usuario ve una pantalla que pregunta a qué juego va a jugar y lista los juegos disponibles
- [ ] **SEL-02**: El usuario puede elegir Marvel Champions y entrar en su flujo guiado
- [ ] **SEL-03**: El usuario ve Warhammer 40.000 en el selector marcado como «Próximamente» y no puede entrar en él
- [ ] **SEL-04**: El usuario entiende, desde la primera pantalla, que esto es una guía de flujo y no un buscador de reglas ni un contador de vida

### Configuración de partida (mini-setup)

- [ ] **SETUP-01**: En una sola pantalla, el usuario indica cuántos jugadores hay
- [ ] **SETUP-02**: En la misma pantalla, el usuario elige dificultad Normal o Experto
- [ ] **SETUP-03**: Al confirmar, el usuario pasa directamente al primer paso de la preparación de mesa
- [ ] **SETUP-04**: Si existe una partida guardada, el usuario elige explícitamente entre continuarla o empezar una nueva; la app nunca reanuda en silencio
- [ ] **SETUP-05**: Al empezar una partida nueva, el progreso guardado anterior se descarta

### Motor de flujo y navegación

- [x] **FLOW-01**: El usuario avanza al paso siguiente con un único botón «Siguiente», el elemento más prominente de la pantalla
- [x] **FLOW-02**: El usuario puede volver al paso anterior
- [ ] **FLOW-03**: Al avanzar desde el último paso de la ronda, el usuario vuelve al primer paso de la ronda, no al de la preparación
- [ ] **FLOW-04**: Al cerrar el ciclo de la ronda, el contador de ronda se incrementa
- [x] **FLOW-05**: El usuario ve en todo momento una cabecera de orientación con ronda actual, fase actual y posición dentro de la fase
- [ ] **FLOW-06**: El usuario puede abrir un índice del flujo completo y tocar cualquier paso para saltar directamente a él
- [ ] **FLOW-07**: Tras saltar a un paso del bucle de ronda, seguir avanzando continúa correctamente por el bucle desde ese punto
- [ ] **FLOW-08**: Un salto a un paso de la preparación no rompe ni reinicia el contador de ronda

### Contenido de Marvel Champions

- [ ] **CONT-01**: El flujo cubre la preparación de mesa completa, paso a paso, hasta poder empezar a jugar
- [ ] **CONT-02**: El flujo cubre la fase de los jugadores, incluido el orden correcto de fin de fase (descartar, robar, preparar)
- [ ] **CONT-03**: El flujo cubre la fase del villano con sus 6 pasos oficiales, en el orden del reglamento
- [ ] **CONT-04**: El flujo cubre el fin de ronda, incluido el paso de la ficha de jugador inicial
- [ ] **CONT-05**: El flujo cubre el agotamiento del mazo de jugador y el del mazo de encuentros como casos distintos, con sus consecuencias correctas
- [ ] **CONT-06**: El flujo cubre el cambio de fase del villano al agotarse su vida
- [ ] **CONT-07**: El flujo recuerda, en el momento en que aplican, los estados Aturdido, Confundido y Duro con su resolución correcta
- [x] **CONT-08**: Cada paso que enuncia una regla lleva una cita a su origen en el reglamento oficial (documento, página y sección)
- [ ] **CONT-09**: Todo el contenido queda verificado contra el Rules Reference oficial v1.7 antes de considerarse definitivo, incluidos los errores ya detectados en el borrador (recuento de pasos de la fase del villano, cadencia de obligaciones, quién roba cartas de aumento, Experto frente a Heroico)
- [ ] **CONT-10**: Los pasos enuncian acciones físicas en imperativo y breve, sin reproducir texto extenso del reglamento con copyright
- [ ] **CONT-11**: Un paso equivale a una acción física inequívoca: ni tan fino que sea un festival de toques ni tan grueso que entierre el detalle olvidable

### Adaptación del texto

- [ ] **ADAPT-01**: Los pasos con diferencias por dificultad muestran el texto correspondiente a Normal o Experto según lo elegido
- [ ] **ADAPT-02**: Los pasos que dependen del número de jugadores lo enuncian con el número real de la partida, sin resolver aritmética
- [ ] **ADAPT-03**: Las fórmulas de cantidades (vida del villano, amenaza inicial) se muestran tal cual para que el grupo las resuelva en la mesa
- [ ] **ADAPT-04**: Los pasos con ramas condicionales muestran todas las ramas como texto simultáneamente, sin requerir ningún toque para elegir

### Locución por voz

- [ ] **VOZ-01**: Al llegar a un paso, la app locuta en voz alta una frase corta y curada, distinta del texto completo mostrado en pantalla
- [ ] **VOZ-02**: El usuario puede silenciar y reactivar la voz desde un control siempre visible
- [ ] **VOZ-03**: La preferencia de silencio se conserva entre pasos y entre sesiones
- [ ] **VOZ-04**: Al navegar (siguiente, atrás o salto), cualquier locución en curso se corta antes de empezar la nueva; las locuciones nunca se encolan ni se repiten
- [ ] **VOZ-05**: Si el dispositivo no dispone de voz en español, la app lo indica al usuario y sigue siendo plenamente utilizable solo con texto
- [ ] **VOZ-06**: Si la síntesis de voz no está disponible o falla, el flujo guiado sigue funcionando sin degradarse

### Interfaz en tablet

- [x] **UI-01**: El texto del paso actual es legible a un brazo de distancia en una tablet apoyada junto a la mesa
- [x] **UI-02**: Los controles táctiles tienen un tamaño mínimo de 44-48 pt/dp
- [x] **UI-03**: Los controles principales (Siguiente, Atrás) están al alcance del pulgar sin levantar la tablet
- [x] **UI-04**: La interfaz se presenta en horizontal y no se reorganiza al rotar el dispositivo
- [x] **UI-05**: La interfaz usa un tema oscuro de alto contraste, apto para jugar con luz tenue
- [ ] **UI-06**: La pantalla no se apaga mientras hay una partida en curso
- [ ] **UI-07**: El usuario sabe que la pantalla permanecerá encendida y que eso consume batería
- [ ] **UI-08**: Si el bloqueo de pantalla no está disponible en el dispositivo, la app sigue funcionando con normalidad

### Persistencia

- [ ] **PERS-01**: La posición actual (juego, jugadores, dificultad, paso y ronda) se guarda en el navegador al cambiar de paso
- [ ] **PERS-02**: Al recargar la página o desbloquear la tablet, el usuario recupera exactamente el mismo paso y la misma ronda
- [ ] **PERS-03**: Si el contenido del juego ha cambiado desde que se guardó la partida, la app no reanuda en un paso incorrecto: informa y vuelve al inicio de la sección conservando jugadores y dificultad

### Instalación y funcionamiento offline

- [ ] **OFF-01**: El usuario puede instalar la app en la tablet y abrirla a pantalla completa, sin barra del navegador
- [ ] **OFF-02**: Con la app ya visitada una vez, el flujo completo funciona sin conexión a internet
- [ ] **OFF-03**: Si se cae la conexión a mitad de partida, la app sigue funcionando sin interrupción
- [ ] **OFF-04**: Cuando hay una versión nueva publicada, la app avisa y espera la decisión del usuario; nunca se recarga sola a mitad de ronda

### Base técnica

- [x] **TECH-01**: El contenido de cada juego vive en un fichero de datos versionado en el repositorio, sin backend ni base de datos
- [x] **TECH-02**: Un fichero de contenido mal formado o incompleto hace fallar la validación en CI, nunca llega a la tablet
- [x] **TECH-03**: La lógica del motor de flujo está cubierta por tests automáticos, incluidos el cierre del bucle, el salto entre pasos y la reanudación con contenido desactualizado
- [x] **TECH-04**: Añadir un juego nuevo consiste en añadir un fichero de contenido conforme al esquema, sin tocar el motor
- [ ] **TECH-05**: La app está publicada en una URL accesible desde la tablet

## v2 Requirements

Diferidos. Registrados, pero fuera del roadmap actual.

### Warhammer 40.000

- **W40K-01**: Contenido completo de la secuencia de ronda de Warhammer 40.000, verificado contra su reglamento
- **W40K-02**: El juego deja de estar bloqueado en el selector y es jugable de principio a fin

### Consulta de reglas

- **REF-01**: Pantalla de consulta rápida de palabras clave y estados, accesible sin perder la posición en el flujo
- **REF-02**: Búsqueda por término dentro de la referencia

### Configuración avanzada

- **CONF-01**: Selección de héroes concretos, escenario y conjuntos modulares en la configuración de partida
- **CONF-02**: Soporte del Modo Heroico como eje de dificultad independiente y combinable con Experto
- **CONF-03**: Pasos de preparación específicos según el escenario elegido

### Calidad de la locución

- **AUDIO-01**: Audio pregenerado de calidad como alternativa a la voz del navegador
- **AUDIO-02**: Selección de voz entre las disponibles en el dispositivo

### Internacionalización

- **I18N-01**: Interfaz y contenido disponibles en inglés además de español

## Out of Scope

Excluido explícitamente. Documentado para evitar que reaparezca.

| Feature | Reason |
|---------|--------|
| Cálculo automático de cifras (vida del villano, amenaza) | El usuario prefiere ver la fórmula y resolverla en la mesa; calcularla obliga a mantener estado que puede desincronizarse de los diales físicos |
| Contadores en vivo de vida, amenaza o estado por jugador | Es otra categoría de producto (tracker) con otros modos de fallo: hay que atenderla en cada carta jugada, y si deriva, la app contradice activamente a la mesa. Es el fallo más denunciado de Gloomhaven Helper |
| Editor de juegos y pasos desde la web | Exigiría CMS, autenticación y validación en una app que por diseño no tiene backend; además el contenido se beneficia de revisarse como código contra el reglamento |
| Base de datos de cartas o constructor de mazos | Desvía del problema observado (errores de proceso, no de conocimiento de cartas) y duplica herramientas que ya existen y funcionan bien, como marvelcdb.com |
| Cuentas de usuario, login o sincronización en la nube | Uso en una sola tablet, un solo grupo; añade infraestructura real para un beneficio que nadie necesita aquí |
| Anuncios, suscripciones o cualquier monetización | No es un producto comercial; es además la queja principal del competidor más cercano (Dized) |
| Tutoriales en vídeo | Coste de producción alto por juego y en conflicto directo con el objetivo de una guía ojeable con las manos ocupadas |
| Modo retrato | La tablet se apoya en horizontal junto a la mesa; permitir la rotación es una fuente de bugs documentada, no una función |
| Multijugador en red o pantallas sincronizadas | Una sola tablet compartida en la mesa; nada que sincronizar |
| Selección de voz y ajuste de velocidad de locución en v1 | Los `getVoices()` de los navegadores son poco fiables; fijar `es-ES` y no ofrecer selector es más robusto para v1 |

## Traceability

Qué fases cubren qué requisitos. Se actualiza al crear el roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEL-01 | Phase 1 | Pending |
| SEL-02 | Phase 1 | Pending |
| SEL-03 | Phase 1 | Pending |
| SEL-04 | Phase 1 | Pending |
| SETUP-01 | Phase 1 | Pending |
| SETUP-02 | Phase 1 | Pending |
| SETUP-03 | Phase 1 | Pending |
| SETUP-04 | Phase 1 | Pending |
| SETUP-05 | Phase 1 | Pending |
| FLOW-01 | Phase 1 | Complete |
| FLOW-02 | Phase 1 | Complete |
| FLOW-03 | Phase 2 | Pending |
| FLOW-04 | Phase 2 | Pending |
| FLOW-05 | Phase 1 | Complete |
| FLOW-06 | Phase 1 | Pending |
| FLOW-07 | Phase 2 | Pending |
| FLOW-08 | Phase 2 | Pending |
| CONT-01 | Phase 1 | Pending |
| CONT-02 | Phase 2 | Pending |
| CONT-03 | Phase 2 | Pending |
| CONT-04 | Phase 2 | Pending |
| CONT-05 | Phase 2 | Pending |
| CONT-06 | Phase 2 | Pending |
| CONT-07 | Phase 2 | Pending |
| CONT-08 | Phase 1 | Complete |
| CONT-09 | Phase 2 | Pending |
| CONT-10 | Phase 1 | Pending |
| CONT-11 | Phase 1 | Pending |
| ADAPT-01 | Phase 1 | Pending |
| ADAPT-02 | Phase 1 | Pending |
| ADAPT-03 | Phase 1 | Pending |
| ADAPT-04 | Phase 2 | Pending |
| VOZ-01 | Phase 3 | Pending |
| VOZ-02 | Phase 3 | Pending |
| VOZ-03 | Phase 3 | Pending |
| VOZ-04 | Phase 3 | Pending |
| VOZ-05 | Phase 3 | Pending |
| VOZ-06 | Phase 3 | Pending |
| UI-01 | Phase 1 | Complete |
| UI-02 | Phase 1 | Complete |
| UI-03 | Phase 1 | Complete |
| UI-04 | Phase 1 | Complete |
| UI-05 | Phase 1 | Complete |
| UI-06 | Phase 3 | Pending |
| UI-07 | Phase 3 | Pending |
| UI-08 | Phase 3 | Pending |
| PERS-01 | Phase 1 | Pending |
| PERS-02 | Phase 1 | Pending |
| PERS-03 | Phase 1 | Pending |
| OFF-01 | Phase 4 | Pending |
| OFF-02 | Phase 4 | Pending |
| OFF-03 | Phase 4 | Pending |
| OFF-04 | Phase 4 | Pending |
| TECH-01 | Phase 1 | Complete |
| TECH-02 | Phase 1 | Complete |
| TECH-03 | Phase 1 | Complete |
| TECH-04 | Phase 1 | Complete |
| TECH-05 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 58 total
- Mapped to phases: 58
- Unmapped: 0

---
*Requirements defined: 2026-08-28*
*Last updated: 2026-08-28 after roadmap creation*
