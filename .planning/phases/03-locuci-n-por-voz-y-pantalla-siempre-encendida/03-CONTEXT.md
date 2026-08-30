# Phase 3: Locución por voz y pantalla siempre encendida - Context

**Gathered:** 2026-08-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Sobre el flujo guiado ya completo (23 pasos de preparación + 10 de ronda, contenido definitivo y verificado a mano contra el Rules Reference v1.7), esta fase añade **dos capas de mejora progresiva que nunca bloquean el botón «Siguiente»**:

1. **Locución en español** de una frase corta y curada por paso, distinta del texto en pantalla, con control de silencio siempre visible y persistente, y sin encolar ni repetir nunca (VOZ-01…VOZ-06).
2. **Pantalla siempre encendida** mientras hay partida en curso, con el coste de batería avisado y degradación silenciosa si el dispositivo no lo soporta (UI-06/07/08).

**Trabajo de contenido, no solo de código:** los 10 pasos de la ronda ya tienen `speech` (política DC-1 de la Fase 2), pero **los 23 de preparación tienen 0**. Esta fase salda ese retrofit, que el `ROADMAP.md` anticipaba desde la Fase 1 («retro-adaptarlo después sería caro»).

**Fuera de esta fase:** la instalación PWA y el funcionamiento offline son la Fase 4 (incluida la advertencia de que el paquete de voz del sistema debe haberse descargado con conexión antes). Cualquier corpus de reglas consultable (REF-01/REF-02) sigue en v2.

</domain>

<decisions>
## Implementation Decisions

Numeración continuada desde `02-CONTEXT.md` (D-01…D-37) para que no haya colisiones entre fases.

### Contenido locutado
- **D-38:** Se **autoran a mano las 23 frases `speech` de la preparación** y el **gate de CI se endurece a exigir `speech` no vacío (≤120 caracteres, sin `⚠ × ›`) en TODO paso `kind:'step'`**, no solo en los de la ronda. Es la extensión natural de la política DC-1 que la Fase 2 fijó, y evita el fallo documentado de Dized (leer párrafos enteros por el altavoz). **Descartado el fallback automático a `text`**: contradice VOZ-01 («frase distinta del texto mostrado») y, sobre todo, tapa para siempre los pasos sin frase — nadie se entera de que faltan.
- **D-39:** La voz locuta **solo la acción; el aviso `⚠` no se locuta**. El recordatorio se queda en pantalla, donde ya está permanentemente visible. Mantiene la locución en una frase por paso y respeta la regla que la ronda ya cumple. Consecuencia aceptada: quien no mire la tablet no oye el recordatorio.
- **D-40:** **Solo hablan los pasos `kind:'step'`.** El selector de juego, el mini-setup, la pregunta de reanudación y la pantalla «Mesa lista» (`kind:'summary'`, con su lista de repaso de 7 líneas) quedan mudos: son pantallas de decisión, se miran de cerca y se leen. El gate de contenido **no** debe exigir `speech` en `kind:'summary'` (mismo trato que ya recibe `citation`).
- **D-41:** **Cada variante que declare `text` está obligada a declarar también `speech`, y el gate de CI lo exige.** Motivo concreto encontrado en el escaneo: `setup.encuentros.03` y `setup.escenario.04` tienen variantes por dificultad cuyo texto **contradice al texto base** (base: «Añadid el conjunto adicional que corresponda»; variante Normal: «No añadáis ninguno»). Como `engine/resolve.ts:15` hace `variant?.speech ?? node.step.speech`, una variante sin frase propia locutaría exactamente lo contrario de lo que se ve en pantalla. Hoy son 4 frases más (2 pasos × 2 dificultades). **Descartada la regla de autoría sin gate**: es el tipo de error silencioso que D-36 y CR-01 ya decidieron no dejar al ojo humano.

### Cuándo habla y cuándo calla
- **D-42:** `speak()` se llama **de forma síncrona dentro del propio manejador del toque** que ya invoca `next()`/`prev()`/`jumpTo()` — **nunca desde un `watch` sobre el nodo actual**. En Safari de iPad (el dispositivo objetivo) una locución disparada fuera del gesto del usuario se descarta en silencio: el `watch`, más limpio, deja la función entera muerta justo donde importa. Coste aceptado: la voz se cablea en los ~3 puntos de entrada de la página en vez de en uno solo.
- **D-43:** **«Continuar» de la reanudación locuta el paso recuperado** (y lo mismo el CTA de reconocimiento del aviso de contenido cambiado). Es un toque del usuario, así que funciona también en iPad, y volver de un bloqueo de tablet es precisamente el momento en que oír dónde ibais tiene valor. **No** se locuta al entrar al primer paso desde el mini-setup ni desde «Empezar a jugar» de Mesa lista.
- **D-44:** **No hay botón de repetir locución.** El texto grande en pantalla es siempre la fuente de verdad: si no se ha oído, se lee. Cero superficie nueva en una interfaz mantenida deliberadamente en un solo botón grande. Descartado también «tocar el texto lo repite», que sería una afordancia de toque invisible — justo lo que D-32 prohíbe.
- **D-45:** Además del corte obligatorio al navegar (VOZ-04), una locución en curso **se corta al silenciar** (corte inmediato, sin dejar terminar la frase: quien silencia lo hace porque justo ahora molesta) y **al ocultarse o bloquearse la tablet** (no debe seguir hablando sola junto a la mesa). **No se corta** al abrir el índice de salto ni el modal de detalle del `⚠`/de una opción: la frase es corta y termina sola.

### Control de silencio
- **D-46:** La preferencia de voz vive en **su propia clave de almacenamiento, independiente de la partida**, dentro de la costura existente (`usePersistedSession.ts` es y sigue siendo el único sitio de la app que toca `localStorage`). Motivo: hoy `clear(gameId)` borra el estado entero al elegir «Empezar partida nueva»; si la preferencia viviera ahí, la voz volvería sola en cada partida nueva. Debe sobrevivir a «Empezar partida nueva», al descarte de progreso y al cambio de juego.
- **D-47:** Por defecto, sin preferencia guardada, la **voz está activada**. Es el diferenciador de esta fase y arrancar en silencio la deja escondida detrás de un icono que nadie descubre. Quien no la quiera la silencia una vez y no vuelve a aparecer (D-46).
- **D-48:** El control es un **icono en la cabecera, junto al `≡` del índice**, en el hueco que `app/components/AppHeader.vue` ya tiene reservado con un comentario que nombra expresamente esta fase. Mismo patrón táctil que el `≡` (48×48). **La banda inferior no se toca**: sigue siendo solo «‹ Atrás» y «SIGUIENTE ›», que todo el proyecto ha protegido como el elemento más prominente de la pantalla.
- **D-49:** El control aparece **solo en las pantallas de paso**, que es donde hay voz. Ni el selector, ni el mini-setup, ni «Mesa lista» lo montan (ninguna tiene cabecera hoy y ninguna habla, por D-40). «Siempre visible» de VOZ-02 se satisface en todo el flujo guiado.

### Sin voz disponible, y batería
- **D-50:** Si no hay voz en español, la app muestra **una sola vez un aviso breve y descartable** con qué hacer (Ajustes → Idiomas → Texto a voz), y no vuelve a mostrarse. Cumple «la app lo indica» de VOZ-05 sin repetirse en cada paso. Caso que lo motiva (STACK.md): en Android sin el paquete de voz descargado, Chrome **no falla — cae en silencio a una voz inglesa**, y el grupo no tiene forma de saber por qué suena mal.
- **D-51:** El bloqueo de pantalla se pide **solo con partida en curso** —dentro del toque que arranca o reanuda— y **se vuelve a pedir cada vez que la tablet regresa a primer plano** (el navegador lo suelta solo al ocultarse la pestaña). Se libera al salir al selector o al descartar la partida. Es literalmente el alcance que pide UI-06 y no gasta batería en pantallas donde nadie juega. Descartado un control manual: ningún requisito lo pide y sería un botón más.
- **D-52:** UI-07 se cumple con una **línea fija y discreta en el mini-setup**, bajo el botón de empezar («La pantalla se mantendrá encendida durante la partida»). Se lee en el único momento en que alguien mira la tablet de cerca y sin prisa, no interrumpe nada y **no obliga a persistir ningún «ya lo vio»**. Descartados el aviso descartable (toque extra + estado nuevo) y el icono permanente en cabecera (que ya lleva etiqueta compuesta, contexto de partida, voz e índice).
- **D-53:** La fase se da por buena con **lógica pura testeada en Vitest + una prueba humana bloqueante en la tablet real**, como tarea explícita del plan. Se testea todo lo decidible sin navegador (qué frase corresponde a cada paso y variante, el gate de contenido endurecido, la persistencia de la preferencia, en qué transiciones se corta). **No se añade Playwright en esta fase**: STACK.md lo difiere expresamente y, sobre todo, no puede comprobar lo único que importa — que se oiga bien en el iPad de la mesa. Es el mismo dispositivo de D-36, que es lo que cazó los errores reales en las Fases 1 y 2.

### Claude's Discretion
El usuario no delegó ninguna decisión de forma explícita, pero estas quedan sin fijar y son del ámbito de research/planner:
- **Redacción concreta de las 23 frases `speech` de preparación + las 4 de variantes.** Registro fijado por las fases anteriores: imperativo, plural, breve. Precedente directo en los 10 `speech` de la ronda ya autorados. **Deben pasar por la revisión humana de D-53** — son reformulaciones de contenido ya verificado, pero una frase acortada puede cambiar la regla.
- **Iconografía concreta del control de voz** (símbolo, estado activo/silenciado, etiqueta accesible) y qué aspecto tiene cuando la síntesis no está disponible. La Fase 1 tuvo `01-UI-SPEC.md`: **valorar `/gsd:ui-phase 3`** antes de planificar, ya que esta fase estrena un control en cabecera, un aviso (D-50) y una línea nueva en el mini-setup (D-52).
- **Dónde vive el composable de voz** y cómo se cablea sin romper la regla de que los componentes no importan `~~/engine/*` y de que `useGameSession` es la única costura reactiva del motor. La voz **no es motor**: no toca `cursor`/`round`/`context`.
- **Cómo se detecta «no hay voz en español»** dado que `getVoices()` devuelve `[]` hasta que dispara `voiceschanged`, y que en Android puede devolver entradas genéricas de idioma en vez de voces concretas (STACK.md, confianza MEDIA). Decidir también si el aviso de D-50 cubre además el caso «síntesis no soportada en absoluto» (`isSupported === false`) o solo el de la voz española ausente, y si el descarte del aviso se recuerda entre sesiones o basta con no repetirlo dentro de la misma.
- **Mecanismo concreto de «al ocultarse la tablet»** (D-45) y su relación con el re-pedido del wake lock (D-51): ambos cuelgan del mismo evento de visibilidad y conviene que no se implementen dos veces.
- **Cobertura exacta de tests** más allá de lo que exigen VOZ-01…06 y UI-06/07/08.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Contexto y alcance del proyecto
- `.planning/PROJECT.md` — Core value, restricciones (tablet, español, offline, legal) y decisión ya tomada de usar la voz del navegador. **«Audio pregenerado de calidad» está en Out of Scope**: la voz del sistema es suficiente para v1
- `.planning/REQUIREMENTS.md` — Los 9 requisitos de esta fase: VOZ-01…VOZ-06 (`:59-64`) y UI-06/07/08 (`:73-75`)
- `.planning/ROADMAP.md` — Fase 3 con sus 4 criterios de éxito. **El párrafo de Overview fija que el esquema con frase locutable se diseñó desde la Fase 1 «porque retro-adaptarlo después sería caro»** — D-38 es exactamente ese retrofit
- `.planning/phases/01-motor-de-flujo-selector-y-preparaci-n-de-mesa/01-CONTEXT.md` — **Lectura obligatoria.** D-01…D-19 siguen vigentes
- `.planning/phases/02-bucle-de-ronda-y-reglas-verificadas/02-CONTEXT.md` — **Lectura obligatoria.** D-20…D-37 siguen vigentes. Contiene la política DC-1 sobre `speech` y el principio rector D-31 del contenido
- `.planning/phases/01-motor-de-flujo-selector-y-preparaci-n-de-mesa/01-UI-SPEC.md` — **Sistema de diseño de referencia**: presupuestos de texto, escala tipográfica, tamaños táctiles, política de estados deshabilitados y maquetas de las tres bandas. El control de D-48 debe encajar en la banda superior descrita aquí
- `.planning/phases/02-bucle-de-ronda-y-reglas-verificadas/02-UI-SPEC.md` — Documento *delta* sobre el anterior (cabecera dentro del bucle, `⚠` clicable, índice reordenado). Precedente de formato si se decide hacer `/gsd:ui-phase 3`

### Investigación del proyecto
- `.planning/research/STACK.md` §«Text-to-Speech: what's real vs assumed for iPad/Android in 2026» (`:106-118`) — **la referencia técnica central de esta fase.** Las cuatro trampas documentadas: gesto de usuario obligatorio en iOS (base de D-42), `getVoices()` asíncrono y sin voces en Safari antiguo, hueco del paquete de voz en Android que cae a inglés en silencio (base de D-50), y `speak()` que encola en vez de interrumpir (base de VOZ-04/D-45). **Advierte de que VueUse NO resuelve ninguna de ellas.** §«Screen Wake Lock» (`:120-122`) para D-51: iOS Safari 16.4+, `useWakeLock` ya gestiona el re-pedido al recuperar visibilidad, y hay un issue abierto de comportamiento parcialmente roto en iOS → detectar y degradar en silencio
- `.planning/research/FEATURES.md` — §Q3 (`:23-27`): la locución solo funciona «cuando se limita a líneas cortas»; el fallo de Dized (voz robótica leyendo bloques enteros) es la razón directa de D-38/D-39. §Q4 (`:34`, `:41`, `:67`): el wake lock es table stakes pero **debe ir acompañado de un aviso visible del coste de batería, no asumido en silencio** (base de D-52). `:139` y `:153`: la frase locutable es una dependencia de contenido, no solo de código
- `.planning/research/PITFALLS.md` — Trampas de reanudación y de estado persistido, relevantes para D-43 y D-46
- `.planning/research/ARCHITECTURE.md` — Modelo de flujo y separación motor puro / costura reactiva, que D-42 y el composable de voz no deben romper

### Reglamento oficial
- `~/Downloads/mc_rulesreference_v17-compressed.pdf` — Rules Reference v1.7. **Segundaria en esta fase**: las 23 frases nuevas son reformulaciones de texto ya verificado, no reglas nuevas. Se consulta solo si al acortar una frase surge la duda de si sigue diciendo lo mismo
- `.planning/phases/02-bucle-de-ronda-y-reglas-verificadas/02-CONTENT-REVIEW.md` — Veredicto literal de la revisión humana del contenido de la ronda. Precedente de formato para la revisión de D-53

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`@vueuse/core` 14.4.0 ya está en `dependencies`** (no es una dependencia nueva): `useSpeechSynthesis`, `useWakeLock` y `useLocalStorage` están disponibles hoy sin tocar `package.json`. STACK.md `:29`/`:31` los recomienda **por su estado reactivo (`isSupported`/`isPlaying`/`error`)**, no porque resuelvan las trampas de plataforma — esas hay que manejarlas en la app
- **`app/components/AppHeader.vue`** — la zona derecha es un contenedor flex con un comentario literal: *«la Fase 3 insertará aquí el icono de silencio (VOZ-02) sin reorganizar el layout»*. El botón `≡` (`w-12 h-12`, `aria-label`) es el patrón exacto a copiar para D-48
- **`app/composables/usePersistedSession.ts`** — única costura de `localStorage` de la app; D-46 añade ahí una clave nueva, no una costura nueva
- **`engine/resolve.ts:15`** — `speech: variant?.speech ?? node.step.speech` ya está implementado: el mecanismo de D-41 existe, lo que falta es el gate que impida usarlo mal
- **`engine/schema.ts:60`** — `speech: z.string().max(120).optional()` ya existe, con un comentario que dice literalmente que el consumidor en tiempo de ejecución (TTS) es la Fase 3
- **`engine/__tests__/content.test.ts:362`** — el test DC-1 ya exige `speech` no vacío, ≤120 caracteres y sin `⚠ × ›` **acotado a los 10 pasos de la ronda**, con un comentario que dice: *«Los pasos de setup siguen deliberadamente sin speech (retrofit es Fase 3, VOZ-01) — no se afirma aquí.»* **D-38 es exactamente quitar esa acotación**; D-41 extiende la misma comprobación a las variantes
- **`app/components/ContentChangedNotice.vue`** y **`ConfirmDialog.vue`** — precedentes más cercanos para el aviso descartable de D-50

### Established Patterns
- **Motor puro en `engine/`**, cero imports de Vue/Nuxt/DOM; los componentes **nunca** importan `~~/engine/*`. La voz no es motor: no toca `cursor`/`round`/`context` y no debe entrar en `engine/`
- **Componentes presentacionales tontos**: props y eventos. El control de D-48 emite; quien decide es la página
- **Etiquetas y afordancias derivadas de los datos**, nunca cableadas contra ids concretos (TECH-04) — el motor debe seguir sirviendo para Warhammer 40.000
- **Sin afordancias de toque invisibles** (D-32): base del descarte de «tocar el texto repite» en D-44
- **`zod` es devDependency y solo vive en `engine/schema.ts`**; el contenido llega al navegador como JSON crudo, así que **cualquier campo con `.default()` necesita fallback en runtime** (WR-01)
- **Guard de cliente obligatorio**: toda lectura de almacenamiento o de API del navegador ocurre tras montar, dentro de `onMounted`/`ClientOnly` — nunca en SSR (`ssr: true` en `nuxt.config.ts`). Aplica a la preferencia de voz (D-46), a la detección de voces (D-50) y al wake lock (D-51)

### Integration Points
- **`content/marvel-champions.json`** — 2 secciones. `setup`: 23 pasos `kind:'step'` + 1 `kind:'summary'` («Mesa lista»), **0 con `speech`**. `ronda` (`repeats:true`): 10 pasos, **10 con `speech`**. 2 pasos con variantes por dificultad (`setup.encuentros.03`, `setup.escenario.04`), ambas con `text` propio y **sin `speech`** — el caso exacto que D-41 cierra
- **`app/pages/[game]/index.vue`** — el runner. Aquí se cablea todo: los handlers `@next="next"`, `@back="prev"` de `NavBand`, `onIndexJumpTo`, `onResumeContinue`, `onContentChangedAcknowledge`. **D-42 y D-43 se implementan en estos handlers**, no en un `watch`. Nótese el no-op intencional documentado al final del `<script setup>`: «EMPEZAR A JUGAR» llama al mismo `next()` — por D-40/D-43 ese punto **no** locuta
- **`app/composables/useGameSession.ts`** — expone `currentText` (con `.text`, `.warning`, `.warningDetail`, `.options`); el `speech` resuelto debe llegar por esta misma computed, no leyendo el JSON por otro lado
- **`engine/types.ts:34`** — `speech?: string` en el `TextBlock`; sigue siendo opcional en el tipo aunque el gate de contenido lo exija en la práctica
- **`app/components/MiniSetupScreen.vue`** — recibe la línea de batería de D-52
- **`nuxt.config.ts`** — `routeRules` de caché y prerender ya declarados; **las reglas de `/sw.js` y `/manifest.webmanifest` están puestas pero ambos ficheros llegan en la Fase 4**. Esta fase no toca nada de PWA
- **Despliegue en Vercel** desde `Destrozado/tabletop-assistant`, auto-deploy en push a `main`

</code_context>

<specifics>
## Specific Ideas

- **La voz debe callarse al instante al silenciar** (D-45), no terminar la frase: quien pulsa silencio lo hace porque justo en ese momento molesta.
- **El `⚠` se queda en pantalla y no se locuta** (D-39), aun sabiendo que el caso real que originó D-31 fue precisamente no mirar («el villano tenía Confundido y Aturdido y ni nos dimos cuenta en toda una fase»). Es una decisión consciente a favor de la locución corta; si en mesa vuelve a fallar, la salida está anotada en Deferred.
- **Registro de las frases nuevas:** imperativo, plural, breve — el mismo de las 10 ya escritas. Ejemplos vigentes que fijan el tono: «Jugad vuestros turnos en orden de jugador.» / «Enderezad todas vuestras cartas, incluidas las de encuentro agotadas.»
- **La línea de batería se lee una vez, en el mini-setup, y no se guarda que se ha leído** (D-52): es información que solo importa antes de empezar, y no merece estado persistido.

</specifics>

<deferred>
## Deferred Ideas

- **Botón (o gesto) para repetir la locución** — descartado por D-44 a favor de mantener la interfaz en un solo botón. Reconsiderable si tras jugar una partida resulta que en mesa hay ruido y se pierden frases; la forma menos invasiva sería un icono junto al de silencio, no hacer tocable el texto.
- **Locutar también el aviso `⚠`** — descartado por D-39. Reconsiderable si el grupo sigue olvidándose de recordatorios por no mirar la tablet; obligaría a reescribir también las 10 frases de la ronda.
- **Locutar «Mesa lista» y su lista de repaso** — descartado por D-40 (7 líneas es exactamente la locución larga que el proyecto evita en todas partes). Una frase corta de arranque («Mesa lista, empezad») es la versión reducida que se podría rescatar.
- **Selector de voz, velocidad o volumen** — fuera por decisión de stack ya tomada (STACK.md `:177`: `getVoices()` es inconsistente entre Safari y Android; construir UI sobre eso invita a roturas visibles). Solo `lang = 'es-ES'` y la voz por defecto del sistema.
- **Playwright para humo de PWA/voz** (registro del service worker, `setOffline(true)`, que `speak()` no lance) — descartado aquí por D-53; STACK.md `:40`/`:144` lo sitúa como fase propia posterior, y su encaje natural es la Fase 4 junto al offline.
- **Control manual del bloqueo de pantalla** — descartado por D-51; ningún requisito lo pide.
- **Aviso de que el paquete de voz debe descargarse con conexión antes de jugar sin wifi** — es real (STACK.md `:114`) pero pertenece a la Fase 4, donde el offline es el tema.

</deferred>

---

*Phase: 3-Locución por voz y pantalla siempre encendida*
*Context gathered: 2026-08-30*
