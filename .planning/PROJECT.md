# TableGameAssistant

## What This Is

Una web-asistente para juegos de mesa complejos, pensada para usarse en una tablet apoyada al lado de la partida. Eliges el juego, indicas nº de jugadores y dificultad, y a partir de ahí solo pulsas **Siguiente**: la app te dice —en texto grande y en voz alta— **qué sucede ahora**, paso a paso, desde la preparación de mesa hasta el bucle infinito de rondas. Es para jugar con amigos, no un producto comercial: primero Marvel Champions (el juego al que juegan ahora), después Warhammer 40.000.

## Core Value

Que un grupo pueda jugar una partida completa de Marvel Champions de principio a fin sin abrir el reglamento y sin olvidarse de ningún paso.

## Requirements

### Validated

(Ninguno todavía — hay que enviar para validar)

### Active

- [ ] Selector de juego al abrir la web ("¿A qué juego vas a jugar?")
- [ ] Mini-setup de una sola pantalla: nº de jugadores + Normal/Experto
- [ ] Guía paso a paso de la preparación de mesa (setup) de Marvel Champions
- [ ] Bucle de ronda: fase de jugadores → fase del villano → fin de ronda, que vuelve solo al paso correcto
- [ ] Botón "Siguiente" como interacción principal; también volver atrás
- [ ] Salto directo a cualquier paso, con retorno correcto al bucle al seguir avanzando
- [ ] Locución en voz alta del paso actual con la voz del navegador (Web Speech API), en español
- [ ] Diseño tablet-first: texto grande, corto, claro y conciso; interfaz limpia
- [ ] Contenido de los juegos como JSON versionado en el repo (un juego = un fichero), sin backend
- [ ] El texto de los pasos se adapta al nº de jugadores y a la dificultad (p. ej. "Fase II" en Experto)
- [ ] Los pasos condicionales muestran todas las ramas como texto (Héroe / Alter-Ego)
- [ ] Persistencia del progreso en el navegador: al recargar o desbloquear la tablet vuelve al mismo paso y ronda
- [ ] Publicada en una URL y utilizable sin wifi (PWA instalable con caché offline)
- [ ] Contenido de Marvel Champions verificado contra el reglamento oficial antes de fijarlo

### Out of Scope

- Cálculo automático de cifras (vida del villano, amenaza) — el usuario prefiere ver la fórmula tal cual y hacer la cuenta en la mesa; menos estado, menos errores
- Contadores en vivo de vida / amenaza / estado de cada jugador — la app guía, no sustituye a los diales y fichas físicas
- Warhammer 40.000 jugable en v1 — aparecerá en el selector, pero el contenido llega después de validar el motor con Marvel Champions
- Pantalla de consulta de reglas (estados Aturdido/Confundido/Duro, agotamiento de mazos, límites de cartas) — no entra en v1; el foco es el flujo guiado
- Editor de juegos/pasos desde la web — el contenido lo escribe el desarrollador como datos versionados
- Audio pregenerado de calidad — la voz del navegador es suficiente para v1, sin peso ni pipeline extra
- Backend, base de datos y cuentas de usuario — no hay nada que sincronizar entre dispositivos
- Multiidioma — solo español en v1, aunque sin cerrar la puerta a añadir más después
- Selección de héroes, escenario y conjuntos modulares concretos — el mini-setup se queda en jugadores y dificultad

## Context

- **El problema real, observado jugando:** en la preparación de mesa se hace algo mal (típicamente separar los Archienemigos o construir mal el mazo de encuentros); a mitad de ronda alguien olvida robar en el momento adecuado; se olvida repartir las cartas de encuentro. Son errores de proceso, no de comprensión de las reglas.
- **Marvel Champions es el primer juego** porque es el que el grupo está jugando actualmente. El motor debe ser genérico para admitir Warhammer 40.000 después sin reescribirlo.
- **Existe un resumen de partida previo** de Marvel Champions (elaborado con otra IA), con la estructura: 1) Preparación, 2) Fase de los jugadores, 3) Fase del villano, 4) Fin de ronda y reglas clave. Sirve como **borrador** de contenido, no como mapa validado del flujo: **el propio usuario sospechaba errores y la investigación ya ha confirmado varios** al contrastarlo con el Rules Reference v1.7 oficial — la fase del villano son 6 pasos oficiales y no 4; las obligaciones son «una o más por identidad» y no exactamente una por jugador; solo el villano y los esbirros con la palabra clave Villano roban cartas de aumento; y el Modo Experto no altera la estructura de la fase del villano (eso es el Modo Heroico, un eje de dificultad aparte y combinable). El borrador debe corregirse antes de tratarse como fuente de verdad.
- **Fuentes oficiales disponibles en local** para verificar ese resumen:
  - `/Users/vcompanyb/Downloads/mc_rulesreference_v17-compressed.pdf` (Rules Reference v17 — fuente de verdad)
  - `/Users/vcompanyb/Downloads/Marvel-Champions_aprende_a_jugar.pdf` (Aprende a jugar)
- **La estructura del flujo tiene dos tramos distintos:** el setup es lineal y se recorre una vez; la ronda es un ciclo que se repite indefinidamente. El motor de pasos debe modelar ambos, y el "Siguiente" al final del ciclo debe volver al inicio de la ronda, no al setup.
- **Entorno de uso hostil al ratón:** tablet, manos ocupadas con cartas, mirada a distancia. De ahí el texto grande y el flujo de un solo botón.

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
| Nuxt 4 (última versión) | Elección del usuario; SSG/PWA y componentes encajan con una app de contenido estático | — Pendiente |
| Guía pura, sin calcular cifras | Evita mantener estado de partida y desincronizarse con la mesa física; menos superficie de error | — Pendiente |
| Mini-setup de nº de jugadores + dificultad | Con eso basta para adaptar el texto (Fase I/II, enumerar por jugador) sin llevar contadores | — Pendiente |
| Contenido como JSON versionado en el repo | Añadir un juego es añadir un fichero; sin backend ni editor | — Pendiente |
| Ramas condicionales mostradas como texto completo | Cero toques en un entorno donde las manos están ocupadas; el jugador lee la que aplica | — Pendiente |
| Voz del navegador (Web Speech API) | Funciona ya, sin coste, sin pipeline de audio; calidad suficiente para leer pasos cortos | — Pendiente |
| PWA con caché offline | La wifi puede caerse en mitad de la partida y eso mataría la utilidad | — Pendiente |
| Persistencia del progreso en el navegador | La tablet se bloquea sola; perder la ronda en curso sería inaceptable | — Pendiente |
| Verificar el resumen contra el PDF oficial en una fase dedicada | El usuario sospecha errores en su resumen; el valor entero depende de que la guía sea correcta | — Pendiente |
| Solo español en v1 | El grupo juega en español; i18n añadiría trabajo sin usuario que lo pida | — Pendiente |
| Marvel Champions primero, W40k después | Es el juego que el grupo juega ahora; valida el motor con contenido real antes de generalizar | — Pendiente |

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
*Last updated: 2026-08-28 after initialization*
