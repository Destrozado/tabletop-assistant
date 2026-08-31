# TableGameAssistant

## What This Is

Una web-asistente para juegos de mesa complejos, pensada para usarse en una tablet apoyada al lado de la partida. Eliges el juego, indicas nº de jugadores y dificultad, y a partir de ahí solo pulsas **Siguiente**: la app te dice —en texto grande y en voz alta— **qué sucede ahora**, paso a paso, desde la preparación de mesa hasta el bucle infinito de rondas. Es para jugar con amigos, no un producto comercial: primero Marvel Champions (el juego al que juegan ahora), después Warhammer 40.000.

## Core Value

Que un grupo pueda jugar una partida completa de Marvel Champions de principio a fin sin abrir el reglamento y sin olvidarse de ningún paso.

## Current State

**v1.7 — SHIPPED 2026-08-31.** Ver `.planning/milestones/v1.7-ROADMAP.md` y `.planning/milestones/v1.7-REQUIREMENTS.md` para el archivo completo del hito.

Un grupo puede hoy abrir https://tabletop-assistant.vercel.app/, elegir Marvel Champions, configurar jugadores y dificultad, y jugar una partida completa de principio a fin —preparación de mesa, bucle de ronda con sus 6 pasos oficiales de fase del villano, fin de ronda— con voz en español pregenerada (Gemini TTS, voz Rasalgethi) en vez de la síntesis del dispositivo, pantalla siempre encendida, y funcionamiento completo sin conexión una vez instalada como PWA. 60 de los 61 requisitos v1 quedan satisfechos; solo VOZ-08 (el respaldo silencioso a la voz del sistema cuando falta un clip) queda deliberadamente sin marcar, a la espera de una prueba en la tablet real de mesa.

El hito se entregó en 5 fases (1, 2, 3, 03.1, 4 — 30 planes en total) a lo largo de cuatro días (2026-08-28 a 2026-08-31, 263 commits). La Fase 03.1 fue una inserción urgente: una prueba humana bloqueante en la Fase 3 juzgó inaceptable la voz de síntesis del dispositivo para jugar en mesa, así que se sustituyó por audio pregenerado antes de seguir adelante — la prueba en dispositivo real que este proyecto se exige a sí mismo detectó algo que ninguna revisión de código podía haber visto.

**Deuda conocida al cierre, documentada sin suavizarla** (detalle completo en `v1.7-ROADMAP.md`):
1. VOZ-08 sin marcar — el camino de respaldo silencioso nunca se ha observado en un dispositivo real.
2. Trampa de foco del modal de detalle en iPad/Safari — deducida por código, nunca confirmada en un iPad real.
3. El modelo y SO/navegador de la tablet de mesa siguen sin conocerse — bloqueante abierto desde la Fase 1, preguntado dos veces, nunca respondido; todas las pruebas humanas del hito se hicieron en un teléfono Android.
4. El control de silencio nunca se ha ejercitado con audio pregenerado real en dispositivo (cortar a mitad de frase, reactivar, sobrevivir a un recargo).
5. El criterio de amenaza que esperaba un 404 literal para `voice-probe.html` en producción no se cumple al pie de la letra (Vercel devuelve 200 vía fallback SPA), aunque el riesgo real que protegía está genuinamente cerrado.
6. CONT-09 ("todo el contenido verificado") está marcado con una salvedad de proceso: no es una auditoría de tercero independiente, y el gate de esquema que debía sostenerlo estructuralmente no estaba completo en el momento del "aprobado" original de la Fase 2.

Esta deuda se acepta por decisión explícita del usuario: *"no vamos a tener el tablet a corto plazo"*. No bloquea el uso real de la app, que ya está en marcha.

## Next Milestone Goals

Sin definir formalmente todavía — a decidir en la próxima sesión de planificación. Candidatos visibles desde el cierre de v1.7, en orden aproximado de lo que más directamente cierra la deuda conocida frente a lo que amplía alcance:

- **Cerrar la deuda de dispositivo real**: obtener por fin el modelo/SO de la tablet de mesa y ejecutar en ella el guion de pruebas pendiente (VOZ-08, foco del modal, control de silencio con audio pregenerado, instalación PWA) en cuanto el tablet esté disponible.
- **Warhammer 40.000** (W40K-01/02): el segundo juego que motivó diseñar el motor de forma genérica desde el principio.
- **Ampliar la consulta de reglas** (REF-01/REF-02 de v2): palabras clave enlazadas dentro del texto de un paso y búsqueda por término, más allá del recorte acotado que ya cubre UI-09.
- **Configuración avanzada** (CONF-01/02/03): selección de héroes/escenario/conjuntos modulares y el Modo Heroico como eje de dificultad independiente.
- Revisar si AUDIO-01 (audio pregenerado) puede darse ya por completado en `REQUIREMENTS.md` de v2, dado que la Fase 03.1 lo entregó de facto durante v1.7.

## Requirements

### Validated

Ver el archivo completo de resultados por requisito en `.planning/milestones/v1.7-REQUIREMENTS.md`. Resumen: 60/61 requisitos v1 satisfechos y verificados contra el código y, donde aplica, contra pruebas humanas en dispositivo real.

### Active

(Ninguno activo fuera del hito v1.7 ya cerrado — la próxima sesión de planificación definirá el siguiente conjunto de requisitos activos a partir de "Next Milestone Goals" arriba.)

### Out of Scope

- Cálculo automático de cifras (vida del villano, amenaza) — el usuario prefiere ver la fórmula tal cual y hacer la cuenta en la mesa; menos estado, menos errores
- Contadores en vivo de vida / amenaza / estado de cada jugador — la app guía, no sustituye a los diales y fichas físicas
- Warhammer 40.000 jugable en v1 — aparecerá en el selector, pero el contenido llega después de validar el motor con Marvel Champions
- Pantalla de consulta de reglas (estados Aturdido/Confundido/Duro, agotamiento de mazos, límites de cartas) — no entra en v1; el foco es el flujo guiado. **Excepción acotada (D-32, Fase 2):** el aviso `⚠` de un paso concreto es clicable y muestra su consecuencia detallada en v1; lo que queda fuera es la pantalla de consulta como tal, las palabras clave enlazadas dentro del texto del paso y la búsqueda por término
- Editor de juegos/pasos desde la web — el contenido lo escribe el desarrollador como datos versionados
- Audio pregenerado de calidad — **superado durante v1.7**: la Fase 03.1 lo entregó de facto con Gemini TTS; se mantiene la línea aquí como registro histórico de la decisión original de v1
- Backend, base de datos y cuentas de usuario — no hay nada que sincronizar entre dispositivos
- Multiidioma — solo español en v1, aunque sin cerrar la puerta a añadir más después
- Selección de héroes, escenario y conjuntos modulares concretos — el mini-setup se queda en jugadores y dificultad

## Context

- **El problema real, observado jugando:** en la preparación de mesa se hace algo mal (típicamente separar los Archienemigos o construir mal el mazo de encuentros); a mitad de ronda alguien olvida robar en el momento adecuado; se olvida repartir las cartas de encuentro. Son errores de proceso, no de comprensión de las reglas.
- **Marvel Champions es el primer juego** porque es el que el grupo está jugando actualmente. El motor debe ser genérico para admitir Warhammer 40.000 después sin reescribirlo.
- **Existe un resumen de partida previo** de Marvel Champions (elaborado con otra IA), con la estructura: 1) Preparación, 2) Fase de los jugadores, 3) Fase del villano, 4) Fin de ronda y reglas clave. Sirvió como **borrador** de contenido, no como mapa validado del flujo: **el propio usuario sospechaba errores y la investigación los confirmó** al contrastarlo con el Rules Reference v1.7 oficial — la fase del villano son 6 pasos oficiales y no 4; las obligaciones son «una o más por identidad» y no exactamente una por jugador; solo el villano y los esbirros con la palabra clave Villano roban cartas de aumento; y el Modo Experto no altera la estructura de la fase del villano (eso es el Modo Heroico, un eje de dificultad aparte y combinable). Todas estas correcciones quedaron aplicadas y verificadas durante v1.7 (Fases 1 y 2).
- **Fuentes oficiales disponibles en local** para verificar ese resumen:
  - `~/Downloads/mc_rulesreference_v17-compressed.pdf` (Rules Reference v17 — fuente de verdad)
  - `~/Downloads/Marvel-Champions_aprende_a_jugar.pdf` (Aprende a jugar)
- **La estructura del flujo tiene dos tramos distintos:** el setup es lineal y se recorre una vez; la ronda es un ciclo que se repite indefinidamente. El motor de pasos modela ambos, y el "Siguiente" al final del ciclo vuelve al inicio de la ronda, no al setup.
- **Entorno de uso hostil al ratón:** tablet, manos ocupadas con cartas, mirada a distancia. De ahí el texto grande y el flujo de un solo botón.
- **v1.7 cerrado (2026-08-31):** ver la sección "Current State" arriba para el resumen completo del hito y su deuda conocida.

## Constraints

- **Tech stack**: Nuxt en su última versión (4.x) — decisión del usuario
- **Sin backend**: contenido en ficheros JSON del repo, estado en el navegador — nada que administrar ni pagar
- **Dispositivo objetivo**: tablet en horizontal junto a la mesa; legible a un brazo de distancia
- **Offline**: debe funcionar con la wifi caída a media partida
- **Idioma**: español, incluida la locución
- **Fidelidad de reglas**: el contenido de Marvel Champions debe contrastarse con el Rules Reference oficial v17 antes de darse por bueno; un asistente que guía mal es peor que no tener asistente
- **Legal**: contenido de reglas para uso privado del grupo; no se reproducen cartas, arte ni textos extensos con copyright

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Nuxt 4 (última versión) | Elección del usuario; SSG/PWA y componentes encajan con una app de contenido estático | Completado (v1.7) |
| Guía pura, sin calcular cifras | Evita mantener estado de partida y desincronizarse con la mesa física; menos superficie de error | Completado (v1.7) |
| Mini-setup de nº de jugadores + dificultad | Con eso basta para adaptar el texto (Fase I/II, enumerar por jugador) sin llevar contadores | Completado (v1.7) |
| Contenido como JSON versionado en el repo | Añadir un juego es añadir un fichero; sin backend ni editor | Completado (v1.7) |
| Ramas condicionales mostradas como texto completo | Cero toques en un entorno donde las manos están ocupadas; el jugador lee la que aplica | Completado (v1.7, D-33) |
| Voz del navegador (Web Speech API) | Funciona ya, sin coste, sin pipeline de audio; calidad suficiente para leer pasos cortos | Completado en Fase 3; **sustituida como locución principal en Fase 03.1** tras juzgarse inaceptable en prueba humana real — conservada como respaldo silencioso |
| Audio pregenerado con Gemini TTS (voz Rasalgethi) | La voz de síntesis del dispositivo fue juzgada inaceptable en una prueba bloqueante en tablet real durante la Fase 3 | Completado (Fase 03.1, insertada) |
| PWA con caché offline | La wifi puede caerse en mitad de la partida y eso mataría la utilidad | Completado (v1.7, Fase 4) |
| Persistencia del progreso en el navegador | La tablet se bloquea sola; perder la ronda en curso sería inaceptable | Completado (v1.7) |
| Verificar el resumen contra el PDF oficial en una fase dedicada | El usuario sospechaba errores en su resumen; el valor entero depende de que la guía sea correcta | Completado (v1.7, Fases 1 y 2; cada fase de contenido lleva su propia revisión bloqueante, D-36) |
| Solo español en v1 | El grupo juega en español; i18n añadiría trabajo sin usuario que lo pida | Vigente |
| Marvel Champions primero, W40k después | Es el juego que el grupo juega ahora; valida el motor con contenido real antes de generalizar | Completado para Marvel Champions (v1.7); W40k queda como candidato del próximo hito |
| D-32: el aviso `⚠` es clicable y abre un modal con su consecuencia detallada | El recordatorio en pantalla se quiere siempre; la consecuencia detallada solo si no te la sabes — breve y conciso arriba, detalle a un toque, modal que se cierra fácil para seguir jugando | Completado en la Fase 2 |
| Despliegue en Vercel (no Netlify, la elección original) | El proyecto se desplegó de hecho a Vercel; la decisión se actualizó para reflejar la realidad en vez de al revés. Las cabeceras `Cache-Control: no-cache` de `/sw.js` y `/manifest.webmanifest` se satisfacen igual, vía `nitro.routeRules` | Completado (Fase 1 preparado, publicado formalmente antes del cierre de v1.7) |
| `registerType: 'prompt'`, nunca `'autoUpdate'`, en `@vite-pwa/nuxt` | Un `autoUpdate` recargaría todos los tabs abiertos a mitad de ronda; `prompt` deja una banda descartable que espera la decisión del grupo | Completado (Fase 4) |
| D-36 — la revisión de reglas la hace una persona, no el esquema | El gate de Zod detecta contenido *malformado*, no contenido *incorrecto*. En la Fase 1 los tres errores de fidelidad reales los cazó el usuario a mano, no la verificación automática. Por eso cada fase de contenido lleva una tarea explícita de revisión humana bloqueante antes de dar el contenido por definitivo | Vigente como práctica del proyecto |
| El esquema de contenido rechaza claves desconocidas (`z.strictObject`), no las descarta (Fase 2, CR-01) | En modo *strip* el objeto que validaba CI y el que renderiza la tablet eran objetos distintos, y un `warningDetail` mal escrito daba build verde y un aviso silenciosamente no pulsable. La validación sigue siendo Node/test-time: `zod` nunca entra en el bundle cliente | Completado (Fase 2) |
| La superficie de detalle es reutilizable (Fase 2) | `warningDetail` (un aviso) y `options[]` (una lista de elecciones) comparten `WarningDetailModal.vue`, que distingue registro con `tone: 'warning' \| 'neutral'` — una opción no es una trampa. Un recordatorio sin consecuencia no lleva afordancia de toque | Completado (Fase 2) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-31 after closing milestone v1.7 (5 phases, 30 plans, 60/61 requirements)*
