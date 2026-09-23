# TableGameAssistant

## What This Is

Una web-asistente para juegos de mesa complejos, pensada para usarse en una tablet apoyada al lado de la partida. Eliges el juego, indicas nº de jugadores y dificultad, y a partir de ahí solo pulsas **Siguiente**: la app te dice —en texto grande y en voz alta— **qué sucede ahora**, paso a paso, desde la preparación de mesa hasta el bucle infinito de rondas. Es para jugar con amigos, no un producto comercial: primero Marvel Champions (el juego al que juegan ahora), después Warhammer 40.000.

## Core Value

Que un grupo pueda jugar una partida completa de Marvel Champions de principio a fin sin abrir el reglamento y sin olvidarse de ningún paso.

## Current State

**v1.8 — SHIPPED 2026-09-23.** Archivo completo en `.planning/milestones/v1.8-ROADMAP.md`, `v1.8-REQUIREMENTS.md`, `v1.8-MILESTONE-AUDIT.md` y `v1.8-phases/`.

La app ya no es solo un guion: conoce *vuestra* partida. En el paso «Decidid, como grupo…» se elige villano y el héroe (y nombre opcional) de cada jugador desde un catálogo legal y reproducible de 23 héroes y 3 villanos; durante la partida hay una banda fija de vida de villano y héroes con ▲▼ precargada desde ese catálogo; los pasos que citan una cifra conocida la muestran entre paréntesis sin tocar la voz; al terminar se registra el resultado en un histórico con estadísticas de % de victorias por héroe y villano que funciona entero sin red; y cada partida se respalda en Firestore en segundo plano sin bloquear nunca nada. Las partidas guardadas por la v1.7 desplegada siguen reanudándose.

6 fases (5–10), 72 planes, 170 tareas, del 2026-09-07 al 2026-09-23. 58/58 requisitos satisfechos; auditoría `tech_debt` (sin bloqueos), integración 9/9 y flujos de extremo a extremo 5/5. Al cierre: `npx vitest run` 1284 ✓, `npm run typecheck` ✓, `CI=1 npx playwright test` 47 ✓. La Fase 9 fue la más larga con diferencia (40 planes, 11 rondas de verificación): su defecto de fondo —textos que afirmaban sobre los datos del grupo algo que el código no comprobaba— reapareció con nueve caras distintas, y se acabó cerrando con gates ejecutables sobre la clase de defecto, no sobre cada caso.

Antes del cierre, el lote rápido `260923-3rh` cerró todo lo que no necesitaba a una persona delante: CR-03 (la variante Experto de `setup.escenario.04` ya es cierta para Rhino, Ultron y Kang, con su clip regenerado), WR-02 (tope de tiempo en todas las llamadas de red del respaldo), WR-03 (el SDK de Firebase, ~715 KB, deja de precachearse), toda la deuda INFO/WARNING abierta de la Fase 9 y los huecos del gate de invariantes. Las fases 9 y 10 se re-verificaron después (10: `passed` 12/12; 9: 5/5 en código, `human_needed`).

**Deuda conocida al cierre, sin suavizar** (detalle en la auditoría y en `.planning/todos/pending/`):
1. **Tablet real, otra vez.** Las tres superficies visuales nuevas de la Fase 9 (franja de avisos en flujo, trampa de foco del diálogo de fin de partida, estado «histórico ilegible») no se han visto nunca en un dispositivo físico. Todo v1.8 se comprobó con viewport simulado.
2. **Duda de reglas abierta:** si en Experto Rhino y Ultron usan otra combinación de etapas (RR v1.7 p.28/p.48), el dial de vida del villano mostraría la cifra de la etapa I. Sin confirmar: el PDF del Rules Reference no estaba disponible al cierre. No se ha tocado el motor.
3. El clip `setup.escenario.04.expert` se regeneró con ffmpeg (primer clip no codificado con afconvert) y aún no se ha escuchado.
4. Tres evasiones adyacentes del gate de invariantes de la Fase 9 (`export const`, contenedores fuera del regex, comas dentro de literales), documentadas y sin explotar hoy.
5. De la Fase 7: guarda anti-NaN asimétrica en `computeInitialHeroHealth`; el arreglo del pulsado pegado aplicado a 2 de 8 botones; sin aserción automática del ancho de flecha por debajo de 1024×768.
6. De la Fase 8: sin comprobar si el salto de `contentVersion` sigue conservando `context.counters` de una partida abandonada. (Los otros dos avisos de esa revisión —`getGame` sin guarda de prototipo y `optionsWarningDetail` sin llegar a pantalla— ya están cerrados en el código.)
7. Todo el arrastre de dispositivo de v1.7 (VOZ-08, foco del modal en iPad, control de silencio, modelo de la tablet), sin cambios.

<details>
<summary>v1.7 — estado al cierre (2026-08-31)</summary>

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

</details>

## Next Milestone Goals

Sin definir; se fijan con `/gsd-new-milestone`. Candidatos, por orden de lo que el proyecto arrastra:

- **Cerrar la deuda de dispositivo real** de v1.7 y v1.8 en la tablet de mesa (ver Candidatos abajo).
- **Resolver la duda de reglas de Experto** para Rhino y Ultron contra el Rules Reference v1.7.
- **Warhammer 40.000** como segundo juego: la prueba real de que el motor y el esquema son agnósticos al juego.

## Candidatos para hitos posteriores

- **Cerrar la deuda de dispositivo real**: obtener por fin el modelo/SO de la tablet de mesa y ejecutar en ella el guion de pruebas pendiente (VOZ-08, foco del modal, control de silencio con audio pregenerado, instalación PWA, y de v1.8: banda de contadores, franja de avisos, trampa de foco, histórico ilegible, clip Experto regenerado) en cuanto el tablet esté disponible.
- **Warhammer 40.000** (W40K-01/02): el segundo juego que motivó diseñar el motor de forma genérica desde el principio.
- **Ampliar la consulta de reglas** (REF-01/REF-02 de v2): palabras clave enlazadas dentro del texto de un paso y búsqueda por término, más allá del recorte acotado que ya cubre UI-09.
- **Configuración avanzada restante** (CONF-02/03): escenario y conjuntos modulares concretos, y el Modo Heroico como eje de dificultad independiente. CONF-01 (selección de héroes) quedó entregada en v1.8.
- Revisar si AUDIO-01 (audio pregenerado) puede darse ya por completado en `REQUIREMENTS.md` de v2, dado que la Fase 03.1 lo entregó de facto durante v1.7.

## Requirements

### Validated

Ver el archivo completo de resultados por requisito en `.planning/milestones/v1.7-REQUIREMENTS.md`. Resumen: 60/61 requisitos v1 satisfechos y verificados contra el código y, donde aplica, contra pruebas humanas en dispositivo real.

Validated in Phase 5 (catálogo de héroes y villanos): CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06, CAT-07 — los 7 requisitos del catálogo, verificados 8/8 must-haves contra el código, los datos committeados y una regeneración en vivo desde MarvelCDB (`05-VERIFICATION.md`).

Validated in Phase 6 (selección de villano, héroes y jugadores): SEL-01, SEL-02, SEL-03, SEL-04, SEL-05, SEL-06, SEL-07, SEL-08, SEL-09 — los 9 requisitos de la selección, verificados 5/5 criterios de éxito contra el código (`06-VERIFICATION.md`), más 14/14 comprobaciones humanas en navegador y la revisión de los 23 alias en español contra las cartas físicas del grupo (D-07).

Validated in Phase 7 (banda de contadores y compatibilidad de sesión): HP-01 … HP-10, COMP-01, COMP-02 — verificados 5/5 tras cerrar el bloqueante CR-01 (toque en la celda vecina) con una matriz medida de 5 viewports × 4 nº de jugadores (`07-VERIFICATION.md`).

Validated in Phase 8 (valores conocidos dentro del paso): VAL-01, VAL-02, VAL-03, VAL-04, VAL-05, VAL-06 — los 6 requisitos, verificados 5/5 verdades observables tras el cierre de hueco del plan 08-04 (`08-VERIFICATION.md`), incluida una comparación id-a-id que confirma que los 32 pasos del contenido autorado siguen byte-idénticos y que los 35 clips de audio y sus 35 entradas de manifiesto no se han tocado.

Validated in Phase 9 (histórico y estadísticas): HIST-01 … HIST-09, STAT-01 … STAT-05 — verificados 5/5 en 11 rondas (`09-VERIFICATION.md`); la ronda 11, tras el lote rápido `260923-3rh`, confirma 5/5 en código y deja `human_needed` la comprobación en tablet de las superficies nuevas.

Validated in Phase 10 (respaldo en Firestore): SYNC-01 … SYNC-09 y COMP-03 — los 10 requisitos, verificados 12/12 must-haves contra el código (`10-VERIFICATION.md`) y confirmados por 17/17 comprobaciones de UAT sin incidencias (`10-UAT.md`), de las cuales 16 están cubiertas por tests automáticos y una es la revisión humana bloqueante de las reglas de Firestore realmente desplegadas en la consola. Registro de seguridad aparte con 20 amenazas STRIDE y `threats_open: 0` (`10-SECURITY.md`). Re-verificada tras el lote `260923-3rh`: `passed` 12/12.

Resumen del hito v1.8: 58/58 requisitos satisfechos — archivo por requisito en `.planning/milestones/v1.8-REQUIREMENTS.md`.

### Active

Ninguno: el hito v1.8 está cerrado y el próximo aún no tiene requisitos. `/gsd-new-milestone` crea un `REQUIREMENTS.md` nuevo.

### Out of Scope

- ~~Cálculo automático de cifras (vida del villano, amenaza)~~ — **revertido en v1.8**: la app precarga la vida inicial conocida y la muestra entre paréntesis en el paso. Sigue fuera la amenaza y cualquier cifra que la app tuviera que recalcular sola durante la partida
- ~~Contadores en vivo de vida / amenaza / estado de cada jugador~~ — **revertido en v1.8** para vida de villano y de héroes (banda fija con ▲▼). Siguen fuera los contadores de amenaza y de estados; los diales físicos dejan de ser la única fuente para la vida
- Warhammer 40.000 jugable en v1 — aparecerá en el selector, pero el contenido llega después de validar el motor con Marvel Champions
- Pantalla de consulta de reglas (estados Aturdido/Confundido/Duro, agotamiento de mazos, límites de cartas) — no entra en v1; el foco es el flujo guiado. **Excepción acotada (D-32, Fase 2):** el aviso `⚠` de un paso concreto es clicable y muestra su consecuencia detallada en v1; lo que queda fuera es la pantalla de consulta como tal, las palabras clave enlazadas dentro del texto del paso y la búsqueda por término
- Editor de juegos/pasos desde la web — el contenido lo escribe el desarrollador como datos versionados
- Audio pregenerado de calidad — **superado durante v1.7**: la Fase 03.1 lo entregó de facto con Gemini TTS; se mantiene la línea aquí como registro histórico de la decisión original de v1
- ~~Backend, base de datos y cuentas de usuario~~ — **revertido en parte en v1.8**: Firebase Firestore como respaldo duradero del histórico. Siguen fuera el backend propio y las cuentas de usuario; localStorage sigue siendo la fuente de verdad y la app funciona entera sin red
- Multiidioma — solo español en v1, aunque sin cerrar la puerta a añadir más después
- ~~Selección de héroes, escenario y conjuntos modulares concretos~~ — **revertido en parte en v1.8**: se eligen villano y héroe por jugador dentro del paso de setup (no en el mini-setup). Siguen fuera el escenario y los conjuntos modulares

## Context

- **El problema real, observado jugando:** en la preparación de mesa se hace algo mal (típicamente separar los Archienemigos o construir mal el mazo de encuentros); a mitad de ronda alguien olvida robar en el momento adecuado; se olvida repartir las cartas de encuentro. Son errores de proceso, no de comprensión de las reglas.
- **Marvel Champions es el primer juego** porque es el que el grupo está jugando actualmente. El motor debe ser genérico para admitir Warhammer 40.000 después sin reescribirlo.
- **Existe un resumen de partida previo** de Marvel Champions (elaborado con otra IA), con la estructura: 1) Preparación, 2) Fase de los jugadores, 3) Fase del villano, 4) Fin de ronda y reglas clave. Sirvió como **borrador** de contenido, no como mapa validado del flujo: **el propio usuario sospechaba errores y la investigación los confirmó** al contrastarlo con el Rules Reference v1.7 oficial — la fase del villano son 6 pasos oficiales y no 4; las obligaciones son «una o más por identidad» y no exactamente una por jugador; solo el villano y los esbirros con la palabra clave Villano roban cartas de aumento; y el Modo Experto no altera la estructura de la fase del villano (eso es el Modo Heroico, un eje de dificultad aparte y combinable). Todas estas correcciones quedaron aplicadas y verificadas durante v1.7 (Fases 1 y 2).
- **Fuentes oficiales disponibles en local** para verificar ese resumen:
  - `~/Downloads/mc_rulesreference_v17-compressed.pdf` (Rules Reference v17 — fuente de verdad)
  - `~/Downloads/Marvel-Champions_aprende_a_jugar.pdf` (Aprende a jugar)
- **La estructura del flujo tiene dos tramos distintos:** el setup es lineal y se recorre una vez; la ronda es un ciclo que se repite indefinidamente. El motor de pasos modela ambos, y el "Siguiente" al final del ciclo vuelve al inicio de la ronda, no al setup.
- **Entorno de uso hostil al ratón:** tablet, manos ocupadas con cartas, mirada a distancia. De ahí el texto grande y el flujo de un solo botón.
- **v1.7 cerrado (2026-08-31)** y **v1.8 cerrado (2026-09-23):** ver "Current State" arriba. Código al cierre de v1.8: Nuxt 4 SSG + PWA, motor en TS puro bajo `engine/`, contenido y catálogo como JSON validado por Zod, 1284 tests de Vitest y 47 de Playwright.
- **El Rules Reference no está en el repo** (`reference/*.pdf` está en `.gitignore` por copyright) y al cierre de v1.8 tampoco se encontró en la máquina de desarrollo: cualquier duda de reglas nueva necesita volver a tener el PDF a mano.

## Constraints

- **Tech stack**: Nuxt en su última versión (4.x) — decisión del usuario
- **Sin backend propio**: contenido en ficheros JSON del repo, estado en el navegador. Desde v1.8 hay un único servicio externo, Firestore (gratis), como respaldo opcional del histórico: la app funciona entera sin él y sin sus variables de entorno
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

| v1.8 — La app pasa a llevar estado de partida (vida de villano y héroes) | El usuario constató que sobra espacio en pantalla y que los diales físicos son el punto donde más se despista el grupo. Revierte la exclusión original de contadores en vivo | Completado (Fases 7–8) |
| v1.8 — Firebase Firestore como respaldo del histórico, localStorage como fuente de verdad | El histórico debe sobrevivir a que se borren los datos del navegador, pero la partida no puede depender de la red (constraint offline). Firestore es gratis y no se pausa por inactividad; Supabase habría exigido escribir la cola a mano | Completado (Fase 10). **Matiz sobre el porqué original:** la cola offline del SDK (`persistentLocalCache`) se descartó en el roadmap y no se usa — el caché queda en memoria y la cola es una marca propia en localStorage, para no sumar un segundo almacén IndexedDB. La subida es dispara-y-olvida: ningún fallo de Firestore (reglas, red, cuota, proyecto caído) llega nunca a `record()` ni bloquea la partida, y el SDK solo se carga por `import()` dinámico, fuera de los chunks de arranque |
| v1.8 — MarvelCDB como fuente de las cifras de héroes y villanos | Los valores no están en el Rules Reference sino impresos en las cartas; MarvelCDB los tiene con las FAQ posteriores ya aplicadas. Se toman solo nombres y cifras, nunca texto de carta ni arte (constraint legal). El procedimiento de obtención se documenta en el repo | Completado (Fase 5) — ✓ Good |
| v1.8 — Un valor de vida equivocado no es un fallo crítico | Decisión explícita del usuario: si un número sale mal se corrige con las flechas en la mesa. D-36 (revisión humana bloqueante) sigue aplicando al texto de reglas, no a esta tabla de cifras | Vigente |
| v1.8 — El número concreto se añade entre paréntesis, sin reescribir el texto del paso | Hay 37 clips de voz pregenerada que costaron dinero real; un número variable no se puede pregenerar. Mostrar «…al valor indicado (14)» gana precisión en pantalla sin invalidar ni un solo clip ni el gate de deriva de voz | Completado (Fase 8) — ✓ Good |
| v1.8 — Gates ejecutables sobre la clase de defecto, no sobre cada caso (Fase 9) | El mismo defecto —copy que afirma sobre los datos del grupo algo no comprobado— volvió con nueve caras; solo se cerró cuando un test barre todo `app/` por raíces léxicas y exige un respaldo comprobable a cada excepción, y otro audita el ciclo de vida de toda marca de estado de módulo | Completado (Fase 9 + quick 260923-3rn) — ⚠️ Revisar: quedan tres evasiones adyacentes |
| v1.8 — El SDK de Firebase fuera del precache de Workbox (quick 260923-3rk) | Sin red no hay nada que sincronizar, así que precachear ~715 KB de SDK para todo visitante no habilitaba nada; se excluye por marca de contenido `@firebase/` en el hook `pwa:beforeBuildServiceWorker`, con guardas que rompen la build si la exclusión dejara sin arranque una ruta | Completado — ✓ Good |
| v1.8 — Generador de voz con ffmpeg de respaldo a afconvert (quick 260923-3ri) | afconvert solo existe en macOS y el desarrollo se hace también en Linux/WSL; los argumentos de ffmpeg reproducen el mismo formato (AAC LC, 24 kHz, mono, M4A) | Completado — Pendiente de escucha en tablet |

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
*Last updated: 2026-09-23 after v1.8 milestone*
