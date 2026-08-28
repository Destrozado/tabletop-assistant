---
phase: 01-motor-de-flujo-selector-y-preparaci-n-de-mesa
plan: 06
subsystem: content
tags: [content, marvel-champions, rules-verification, playtest, deployment-prep]

requires: ["01-03", "01-05"]
provides:
  - "content/marvel-champions.json recontrastado dos veces contra el Rules Reference v1.7 (planificación + playtest humano), contentVersion 4"
  - "Veredicto de cierre de fase sobre granularidad (D-04) y orden de bloques (Open Question 2 de 01-RESEARCH): ambos APROBADOS por el usuario"
  - "netlify.toml reverificado contra una build real (npm run generate); despliegue preparado, publicación deliberadamente diferida por decisión del usuario"
affects: []

tech-stack:
  added: []
  patterns: ["hallazgo de regla fantasma detectado por revisión humana del usuario, no por el proceso de autoría original — ver Deviations", "coincidencia numérica: -1 paso por eliminación + 1 paso por división mantiene el total de kind:step en 21"]

key-files:
  created: []
  modified:
    - content/marvel-champions.json
    - engine/__tests__/content.test.ts

key-decisions:
  - "D-04 (granularidad fina, ~21 pasos): APROBADA por el usuario tras recorrer el flujo completo en emulación de tablet, condicionada a los tres ajustes de contenido documentados abajo — no a una revisión de granularidad en sí"
  - "Open Question 2 (orden Mazo de encuentros antes que Escenario del villano): APROBADA sin cambios — el usuario no pidió reordenar bloques"
  - "setup.escenario.04 (paso 15) reescrito: pasa de la expresión opaca 'etapas de villano' a nombrar el objeto físico ('cartas de villano numeradas') en base y en ambas variantes de dificultad, sin alargarlo a una lección de reglas"
  - "setup.escenario.05 (paso 16) dividido en dos pasos: el primero añade la multiplicación por número de jugadores sobre la amenaza inicial (cerrando una inconsistencia con el paso 14, que sí la menciona); el segundo añade la resolución de habilidades 'Cuando se revela' al voltear el escenario, omitida por completo en el borrador anterior"
  - "setup.archienemigos.02 ('Contad las cartas de vuestro conjunto de Archienemigo') ELIMINADO: es una regla fantasma sin respaldo en el Rules Reference — ni Apéndice II paso 5 (p.49) ni 'Nemesis Encounter Set' (p.29) piden contar cartas. Detectado por el usuario durante el playtest, no por la autoría original ni por la reverificación de la Tarea 1"
  - "contentVersion 3 -> 4: un único incremento cubre las tres correcciones (no tres bumps distintos), porque la persistencia solo compara enteros y no necesita granularidad de cambio"
  - "El total de pasos kind:step se mantiene en 21 por coincidencia numérica (-1 por la eliminación, +1 por la división): ningún gate de recuento estructural necesitó cambiar, solo la lista de ids con warning (setup.archienemigos.03 -> setup.archienemigos.02)"
  - "TECH-05 (despliegue): preparación completa y reverificada con una build real; la publicación efectiva queda deliberadamente diferida por decisión explícita del usuario ('Preparar, no desplegar'), no es un bloqueo ni un fallo"

requirements-completed: [CONT-08, CONT-11]

duration: ~55min (esta sesión de continuación; Tarea 1 se completó en una sesión previa, ver 50c3439)
completed: 2026-08-28
---

# Fase 1 Plan 06: Cierre de fase — playtest, correcciones de fidelidad y despliegue preparado Summary

**El playtest humano completo del flujo de preparación encontró y corrigió tres fallos reales de fidelidad de reglas que la reverificación automática de la Tarea 1 no había detectado — incluida una regla fantasma sin respaldo en el Rules Reference — y cierra la fase con granularidad y orden de bloques aprobados, y el despliegue a Netlify preparado pero deliberadamente sin publicar.**

## Performance

- **Duration:** Tarea 1 completada en sesión previa (~ver 01-06 commit `50c3439`); esta sesión de continuación (Tareas 2 y 3): ~55 min
- **Completed:** 2026-08-28
- **Tasks:** 3/3 completadas (1 automática ya comprometida al iniciar esta sesión; 2 checkpoints resueltos con veredicto del usuario)
- **Files modified en esta sesión:** 2 (`content/marvel-champions.json`, `engine/__tests__/content.test.ts`)

## Accomplishments

### Tarea 1 (ya comprometida al iniciar esta sesión — no repetida)

- Los 21 pasos y sus citas se recontrastaron página a página contra el PDF oficial. `setup.escenario.04` (paso 15) se corrigió de "cara del escenario" a "etapa del villano"; `contentVersion` pasó de 2 a 3. `README.md` se creó con instrucciones de arranque, build, test y despliegue. Commit: `50c3439`.

### Tarea 2 — Prueba de flujo completo y revisión de granularidad (D-04)

- El usuario recorrió el flujo entero en emulación de tablet y respondió **"aprobado"** con tres excepciones puntuales de contenido, no de granularidad ni de orden de bloques:
  - **Granularidad (D-04):** APROBADA sin cambios estructurales.
  - **Orden de bloques (Open Question 2 de 01-RESEARCH):** APROBADO sin cambios — "Mazo de encuentros" se mantiene antes que "Escenario del villano".
- **Corrección 1 — `setup.escenario.04` (paso 15) era incomprensible para el usuario real.** La variante `normal` decía "Usad las etapas de villano estándar, tal como vienen en el escenario", y el usuario no pudo identificar qué debía hacer físicamente. Verificado contra el Rules Reference (p.28 "Modes of Play — Expert Mode", p.45 "Villain, Villain Deck": *"The villain is represented by a sequential deck of one or more cards"*, p.48 Appendix I: *"Expert mode uses a different combination of villain stages"*): la regla era correcta, la redacción fallaba. Reescrito el texto base y ambas variantes para nombrar el objeto físico ("cartas de villano numeradas") en vez del término abstracto "etapas".
- **Corrección 2 — `setup.escenario.05` (paso 16) tenía dos omisiones reales.** Verificado contra "Per Player Icon" (p.31: *"A per player icon next to a value multiplies that value by the number of players who started the scenario"*) y "Main Scheme" (p.27, paso 3 de "when the main scheme deck advances": *"Flip the top card... place threat... equal to its starting threat value, and resolve any 'When Revealed' ability on that side"*):
  - (a) el paso no mencionaba la multiplicación por número de jugadores sobre la amenaza inicial, inconsistente con el paso 14 (vida del villano) que sí la menciona con la misma fórmula genérica.
  - (b) el paso omitía por completo la resolución de habilidades "Cuando se revela" al voltear el escenario, un olvido de reglas real en la preparación (Apéndice II, paso 12b).
  - Ambas correcciones no cabían en un solo paso dentro del presupuesto de 90 caracteres sin convertirlo en una lección de reglas, así que se dividió en dos pasos (`setup.escenario.05` y el nuevo `setup.escenario.06`), como autorizaba explícitamente el usuario.
- **Corrección 3 (detectada por el propio usuario, no anticipada por el plan) — `setup.archienemigos.02` ("Contad las cartas...") era una regla fantasma.** El usuario preguntó para qué servía contar las cartas si el paso nunca decía qué hacer con la cuenta. Verificado que ni Apéndice II paso 5 (p.49: *"For each identity being played, set aside their nemesis and the encounter cards of that nemesis"*) ni "Nemesis Encounter Set" (p.29: *"each player sets aside the cards from their associated nemesis set, out of play"*) piden contar nada. El paso se **eliminó por completo**; los pasos vecinos (`localizar` + `apartar`) ya cubren la regla real entre los dos, sin fusionarlos (el usuario no pidió esa fusión — se deja como recomendación para la Fase 2, ver más abajo).
- `contentVersion` 3 → 4, un único incremento para las tres correcciones.
- El total de pasos `kind:step` se mantiene en 21 por coincidencia numérica (archienemigos pasa de 3 a 2 pasos, escenario pasa de 6 a 7), así que la mayoría de los gates estructurales de `engine/__tests__/content.test.ts` no necesitaron cambiar — solo la lista de ids con `warning`, porque el paso que llevaba el aviso se renumeró de `setup.archienemigos.03` a `setup.archienemigos.02`.
- `npm run test`: 56/56 verde. `npm run generate`: build real completada, `contentVersion: 4` y el texto reescrito confirmados embebidos en el bundle estático (`.output/public/_nuxt/*.js`), luego limpiada sin comitear (`.output`/`dist` son artefactos de build, no se versionan).

### Tarea 3 — Despliegue conjunto a Netlify (TECH-05), bajo decisión "Preparar, no desplegar"

- El usuario decidió explícitamente preparar el despliegue sin ejecutarlo. Alcance cerrado como "preparado y verificado, publicación diferida", no como pendiente ni como fallo.
- `netlify.toml` reverificado contra una build real de esta sesión: `npm run generate` produce `.output/public` (coincide exactamente con `publish = ".output/public"`), confirmando de nuevo la asunción A1 de `01-RESEARCH.md` (ya cerrada en el plan 01-01).
- Cabeceras de caché reverificadas en `netlify.toml`: `Cache-Control: no-cache` en `/sw.js` y `/manifest.webmanifest` (más `Content-Type: application/manifest+json` en el segundo), y `Cache-Control: public, max-age=31536000, immutable` en `/_nuxt/*`. Siguen preparadas para cuando la Fase 4 instale `@vite-pwa/nuxt`; no hay `/sw.js` ni `/manifest.webmanifest` reales todavía porque ese módulo no se instala en esta fase.
- `README.md` ya documentaba el procedimiento de despliegue (`## Despliegue`, añadido en el plan 01-01) — reverificado como correcto y suficiente, sin cambios necesarios.
- Comprobado antes de cualquier posible push: `.gitignore` cubre `node_modules/`, `.nuxt/`, `.output/`, `dist` y `*.log`; no existe ningún fichero `.env` en el árbol; `git status` está limpio salvo por el trabajo de esta fase y una modificación preexistente no relacionada en `.planning/config.json` (no tocada).
- **No se ejecutó ningún paso que publique:** no se creó remoto `origin`, no hubo `git push`, no se creó ninguna cuenta ni sitio de Netlify, no se lanzó ningún despliegue. Esto es exactamente lo que pidió la decisión del usuario, no una limitación de esta sesión.

## Task Commits

1. **Tarea 1** (comprometida antes de esta sesión) — `50c3439` (fix)
2. **Tarea 2 — Tres correcciones de fidelidad de reglas + eliminación de regla fantasma** — `7c2a46d` (fix)
3. **Tarea 3 — Verificación de despliegue preparado** — sin commit: es una tarea de verificación pura, no modificó ningún fichero versionado (`netlify.toml` no cambió; la build de verificación se generó y se limpió sin comitear)

## Files Created/Modified

- `content/marvel-champions.json` — `contentVersion` 3→4; `setup.archienemigos.02` eliminado y `setup.archienemigos.03` renumerado a `.02`; `setup.escenario.04` reescrito (base + 2 variantes); `setup.escenario.05` reescrito y dividido, `setup.escenario.06` nuevo, antiguo `.06` renumerado a `.07`
- `engine/__tests__/content.test.ts` — actualizada la lista de ids con `warning` (`setup.archienemigos.03` → `setup.archienemigos.02`); ningún otro gate estructural cambió porque el total de pasos se mantuvo en 21

## Decisions Made

Ver `key-decisions` en el frontmatter. Resumen para lectores futuros: la fase se cierra con D-04 y la Open Question 2 aprobadas tal cual, tres correcciones de contenido aplicadas (una reescritura de claridad, una división por omisión de reglas, una eliminación de regla fantasma), y el despliegue TECH-05 preparado y reverificado pero deliberadamente no publicado.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `setup.escenario.04` (paso 15) era incomprensible para un usuario real pese a citar la regla correcta**
- **Found during:** Tarea 2, checkpoint de playtest — el usuario preguntó explícitamente qué significaba el paso
- **Issue:** La redacción usaba el término abstracto "etapas de villano" sin explicar qué cartas físicas representa
- **Fix:** Reescritos el texto base y ambas variantes de dificultad para nombrar el objeto físico ("cartas de villano numeradas") en vez del término abstracto, sin alargar el texto a una lección de reglas (presupuesto de 90 caracteres respetado: 79/80/85)
- **Files modified:** `content/marvel-champions.json`
- **Verification:** `npm run test` en verde; longitudes de texto verificadas por script antes de aplicar
- **Committed in:** `7c2a46d`

**2. [Rule 2 - Missing Critical] `setup.escenario.05` (paso 16) omitía la multiplicación por jugadores y la resolución de "Cuando se revela"**
- **Found during:** Tarea 2, checkpoint de playtest — el usuario intuyó (incorrectamente, pensó que era aditivo) que faltaba la multiplicación
- **Issue:** (a) inconsistencia con el paso 14, que sí menciona la fórmula "por el número de jugadores" para la misma mecánica de icono por jugador (p.31); (b) omisión completa de la cláusula "resolved cualquier habilidad 'Cuando se revela'" del Apéndice II paso 12b (p.49) y de "Main Scheme" (p.27)
- **Fix:** Añadida la fórmula "por el número de jugadores" al paso existente; dividido en un segundo paso nuevo (`setup.escenario.06`) que resuelve explícitamente las habilidades "Cuando se revela", con cita propia verificada
- **Files modified:** `content/marvel-champions.json`
- **Verification:** `npm run test` en verde; ambas citas verificadas con `pdftotext -f/-l` en esta sesión (p.27, p.31, p.49)
- **Committed in:** `7c2a46d`

**3. [Rule 1 - Bug] `setup.archienemigos.02` era una regla fantasma sin respaldo en el Rules Reference**
- **Found during:** Tarea 2, checkpoint de playtest — el usuario preguntó para qué servía contar las cartas del conjunto de Archienemigo si el paso nunca decía qué hacer con la cuenta
- **Issue:** Ni Apéndice II paso 5 (p.49) ni "Nemesis Encounter Set" (p.29) piden contar cartas del conjunto de Archienemigo en ningún momento de la preparación; el paso instruía una acción sin respaldo en la fuente oficial
- **Fix:** Paso eliminado por completo. Los pasos vecinos (`localizar` + `apartar`) ya cubren, entre los dos, la regla real verificada — no se fusionaron por decisión explícita del usuario (ver Next Phase Readiness)
- **Files modified:** `content/marvel-champions.json`, `engine/__tests__/content.test.ts` (renumeración de id en la lista de warnings)
- **Verification:** `npm run test` 56/56 en verde; ambas citas reverificadas con `pdftotext -f/-l` en esta sesión (p.29, p.49)
- **Committed in:** `7c2a46d`

---

**Total deviations:** 3 auto-fixed, las tres correcciones de contenido de fidelidad de reglas encontradas por revisión humana durante el playtest (Rule 1/Rule 2, no arquitectónicas). Ninguna requirió Rule 4 (no hubo cambio estructural del motor ni del esquema — todo el trabajo fue de contenido).

**Nota sobre el origen de estos hallazgos:** las tres correcciones no fueron detectadas por la reverificación automática de la Tarea 1 (que sí abrió el PDF página a página) ni por el proceso de autoría original del plan 01-03 — las encontró exclusivamente el juicio humano del usuario al intentar seguir el flujo como jugador real. Esto confirma directamente el valor del checkpoint bloqueante de la Tarea 2 (D-04): un test automatizado no puede detectar que una instrucción es incomprensible, ni que una regla parece "fantasma" hasta que alguien se pregunta para qué sirve.

## Verificación de la reverificación (páginas del Rules Reference abiertas en esta sesión)

| Página | Sección | Usada para |
|--------|---------|------------|
| 27 | "Main Scheme", paso 3 de "when the main scheme deck advances" | Confirmar la cláusula completa (voltear + colocar amenaza + resolver "Cuando se revela") — corrección 2 |
| 28 | "Modes of Play — Expert Mode" | Confirmar "using the listed expert mode villain stages" — corrección 1 |
| 29 | "Nemesis Encounter Set" | Confirmar que no se pide contar cartas — corrección 3 |
| 31 | "Per Player Icon" | Confirmar el texto exacto de la multiplicación por jugadores — corrección 2 |
| 39 | "Standard Set" | Reverificación cruzada de un paso ya existente, sin cambios (confirmado correcto) |
| 44-45 | "Villain, Villain Deck" | Confirmar que el villano es un mazo secuencial de cartas de etapa — corrección 1 |
| 48 | "Appendix I: Deck Customization — Encounter Decks" | Confirmar "Expert mode uses a different combination of villain stages" — corrección 1 |
| 49 | "Appendix II: Setup", pasos 5, 7, 8, 9, 10, 11, 12b, 14, 15, 16 | Reverificación cruzada de pasos existentes y de las tres correcciones |

**Revisión adicional pedida por el usuario:** se repasaron todos los demás pasos de la tabla de 21 (ahora 21, tras la eliminación+división) contra sus citas, buscando otras posibles reglas fantasma del mismo tipo que la corrección 3. No se encontró ninguna otra: cada paso restante tiene una acción física que su cita respalda literalmente.

## Issues Encountered

Ninguno bloqueante.

## Pendiente de verificación humana — consolidado de toda la fase 01

Esta es la lista completa de verificaciones humanas que quedan abiertas al cerrar la Fase 1, para que la Fase 2 (o el primer uso real) las recoja sin tener que releer los seis planes:

- **D-19 (legibilidad física a distancia de mesa real):** la comprobación proxy en emulación de DevTools (40px de frase de acción, 48px en controles) se hizo en la Tarea 2 y es correcta, pero el cierre real de D-19 solo puede ocurrir con la tablet física apoyada junto a la mesa — y eso requiere que la app esté publicada. Como la Tarea 3 se completó como "preparado, no desplegado" por decisión del usuario, **D-19 queda pendiente hasta que el usuario decida publicar** (no es un bloqueo de esta fase, es la consecuencia directa y esperada de esa decisión).
- **Verificación en tablet real de la Tarea 3, punto 8-9 (flujo completo, veredicto de legibilidad):** no realizada, por el mismo motivo — no hay URL pública que abrir en la tablet todavía.
- **Recomendación para la Fase 2 (no aplicada en esta fase, por decisión explícita del usuario en el checkpoint):** revisar si `setup.archienemigos.01` (localizar) y `setup.archienemigos.02` (apartar, antes `.03`) deberían fusionarse en un solo paso ahora que el paso intermedio ("contar") desapareció — quedan dos pasos consecutivos muy cortos en el mismo bloque. No se aplica ahora porque el usuario no pidió esa fusión específica.
- **Recorrido interactivo de tablet (Tarea 2, puntos 1-8 y 11 de la lista de verificación):** realizado y aprobado por el usuario en esta sesión de checkpoint (respuesta "aprobado" salvo las tres excepciones de contenido ya corregidas). No se reejecutó en esta sesión de continuación porque no existe herramienta de navegador en este entorno de ejecución — se registra como completado por el usuario, no como pendiente.

## Next Phase Readiness

- La Fase 1 queda completa: 8/8 planes comprometidos (01 a 08, con 06 siendo el último en cerrarse).
- `content/marvel-champions.json` en `contentVersion: 4` es el punto de partida verificado para la Fase 2 (bucle de ronda) — cualquier edición futura del fichero de esta fase debe seguir incrementando `contentVersion`.
- Recomendación para la Fase 2 (no una tarea pendiente, un candidato a revisar): considerar fusionar `setup.archienemigos.01`/`.02` en un solo paso, ver "Issues Encountered"/deviations arriba.
- El despliegue efectivo a Netlify (TECH-05, conexión GitHub+Netlify, primer push) queda como el primer paso manual conjunto cuando el usuario decida publicar — `netlify.toml` y `README.md` ya están listos para ese momento sin trabajo adicional.
- D-19 (legibilidad física real) y la verificación de tablet real de la Tarea 3 quedan pendientes de esa misma publicación futura — ver sección dedicada arriba.

## Self-Check

```
FOUND: content/marvel-champions.json
FOUND: engine/__tests__/content.test.ts
FOUND: README.md
FOUND: netlify.toml
FOUND commit: 50c3439
FOUND commit: 7c2a46d
```

## Self-Check: PASSED

---
*Phase: 01-motor-de-flujo-selector-y-preparaci-n-de-mesa*
*Plan: 06*
*Completed: 2026-08-28*

---

## ADENDA (2026-08-29) — Dos correcciones más de fidelidad de reglas, post-cierre

**No forma parte del plan 01-06 original.** Fase 1 ya estaba completa (8/8) y verificada cuando la revisión humana del usuario encontró dos defectos adicionales de la misma clase que las tres correcciones documentadas arriba. Aplicadas y comprometidas en un commit atómico separado, sin nuevo SUMMARY ni nueva sección en ROADMAP/STATE — solo esta adenda.

**Commit:** `fb2a4e0` — `fix(01-06): dos correcciones más de fidelidad de reglas (vida del villano y pasos 12a/12c del Apéndice II)`

### Corrección 4 — `setup.escenario.02` (vida del villano): sobreafirmación "por el número de jugadores"

- **Issue:** El texto decía "Ajustad el dial de vida del villano a su vida impresa por el número de jugadores." El Apéndice II paso 9 (p.49, verificado con `pdftotext -f/-l`) dice literalmente *"Set the villain's hit point dial to the value indicated by the villain card"* — genérico, sin multiplicación. La anatomía de carta de Villano (p.52, punto 5, también verificada) es igualmente genérica: *"A value that represents this card's durability."* Que un valor impreso lleve el icono "por jugador" es propiedad de cada carta concreta (regla ya cubierta aparte, "Per Player Icon", p.31), no una regla general de este paso — el mismo defecto ya revertido para la amenaza inicial en el commit `d5e3043`.
- **Fix:** Reescrito a "Ajustad el dial de vida del villano al valor indicado en la carta de villano." Cita ajustada a "Apéndice II, paso 9; ver también anatomía de carta de Villano (p.52, punto 5)", sin mención a "Per Player Icon" en la cita (mismo criterio que `d5e3043`).
- **Test actualizado:** `engine/__tests__/content.test.ts` — el test que exigía `/número de jugadores/i` en este paso pasó a exigir `/valor indicado en la carta de villano/i` y a rechazar cualquier mención a "jugadores".

### Corrección 5 — Apéndice II paso 12: faltaban 12a y 12c por completo

- **Issue:** El paso 12 ("Resolve Scenario Setup and When Revealed Abilities", p.49, verificado) tiene tres sub-pasos — 12a (Preparación en la carta de escenario, cara 1A), 12b (voltear a 1B + Cuando se revela de esa cara) y 12c (Preparación y Cuando se revela en la carta de villano) — y el contenido solo cubría 12b. Un grupo siguiendo la app se saltaría por completo la habilidad de Preparación del escenario y las habilidades de Preparación/Cuando se revela del villano.
- **Fix:** Añadidos `setup.escenario.06` (12a, "Resolver Preparación del escenario (cara 1A)") y `setup.escenario.09` (12c, "Resolver Preparación y Cuando se revela del villano"), en el orden correcto de reglas: 12a precede al volteo a 1B (no lo sigue), 12c sigue a 12b. De paso se corrigió que el antiguo paso 11 ("Poner en juego cartas de Preparación") estaba mal posicionado después del bloque 12b; se movió a `setup.escenario.05`, antes de todo el bloque 12, que es donde le corresponde según el Apéndice II.
- **Secuencia final verificada paso a paso contra Apéndice II 7-12:** `.01`=paso8, `.02`=paso9, `.03`=paso7, `.04`=variante de dificultad (autoral, sin número de paso oficial), `.05`=paso11, `.06`=paso12a, `.07`=paso12b(volteo+amenaza), `.08`=paso12b(Cuando se revela), `.09`=paso12c.

### Impacto en conteos y versión

- `contentVersion`: 5 → 6.
- Pasos `kind:step`: 21 → 23 (24 nodos totales con el resumen).
- Actualizados todos los conteos que dependían del total anterior: `engine/__tests__/content.test.ts` (dos asserts de conteo total), y los comentarios ilustrativos de ejemplo en `app/composables/useGameSession.ts` ("el paso 22 de 22" → "el paso 24 de 24") y en `app/pages/[game]/index.vue` ("8 de 21" → "8 de 23"). `README.md` no mencionaba ningún conteo, sin cambios necesarios.
- `npm run test`: 56/56 verde. `npm run generate`: exit 0.

### Ficheros modificados en esta adenda

- `content/marvel-champions.json`
- `engine/__tests__/content.test.ts`
- `app/composables/useGameSession.ts`
- `app/pages/[game]/index.vue`

**Detectado por revisión humana del usuario, no por el proceso de autoría ni por ninguna reverificación automática previa — mismo patrón que las correcciones 1-3 originales de este plan.**
