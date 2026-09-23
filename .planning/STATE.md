---
gsd_state_version: "1.0"
milestone: v1.8
milestone_name: Elección de personajes, contadores en mesa e histórico de partidas
current_phase: 10
status: completed
stopped_at: Phase 10 complete — all phases complete
last_updated: "2026-09-23T02:44:54.657Z"
last_activity: 2026-09-23
last_activity_desc: Phase 10 verified — UAT 17/17, verificación 12/12 re-sellada
state_head: 9f4b893f392c4b380628566c4ff3a4d9859ea75a
progress:
  total_phases: 6
  completed_phases: 11
  total_plans: 72
  completed_plans: 72
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-23)

**Core value:** Que un grupo pueda jugar una partida completa de Marvel Champions de principio a fin sin abrir el reglamento y sin olvidarse de ningún paso.
**Current focus:** Hito v1.8 completo (fases 5–10) — listo para cerrar el hito

## Current Position

Phase: 10
Plan: Not started
Status: All phases complete — UAT y verificación de la Fase 10 cerradas
Last activity: 2026-09-23 — Phase 10 verified (UAT 17/17, 0 incidencias)

## Performance Metrics

**Velocity:**

- Total plans completed: 83
- Average duration: — min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 8 | - | - |
| 02 | 5 | - | - |
| 03 | 5 | - | - |
| 05 | 6 | - | - |
| 07 | 11 | - | - |
| 08 | 4 | - | - |
| 09 | 40 | - | - |
| 10 | 4 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01 P01 | 25min | 2 tasks | 13 files |
| Phase 01 P07 | 20min | 3 tasks | 13 files |
| Phase 01 P08 | 12min | 2 tasks | 7 files |
| Phase 01 P02 | 25min | 2 tasks | 5 files |
| Phase 01 P03 | 35min | 2 tasks | 2 files |
| Phase 01 P04 | 25min | 3 tasks | 7 files |
| Phase 01 P05 | 25min | 3 tasks | 4 files |
| Phase 01 P06 | 55min | 3 tasks | 2 files |
| Phase 03 P05 | 35min | 3 tasks | 2 files |
| Phase 03.1 P01 | N/A (2 sesiones) | 3 tasks | 10 files |
| Phase 03.1 P04 | 35min | 2 tasks | 4 files |
| Phase 03.1 P05 | 50min | 3 tasks | 4 files |
| Phase 08 P03 | 40min | 3 tasks | 4 files |
| Phase 09 P12 | 9min | 3 tasks | 7 files |
| Phase 09 P24 | 8min | 4 tasks | 3 files |
| Phase 09 P25 | 6min | 2 tasks | 4 files |
| Phase 09 P26 | 10min | 2 tasks | 5 files |
| Phase 09 P27 | 15min | 2 tasks | 3 files |
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 09 P32 | 12min | 3 tasks | 8 files |
| Phase 09 P33 | 10min | 3 tasks | 6 files |
| Phase 09 P34 | 23min | 3 tasks | 2 files |
| Phase 09-hist-rico-y-estad-sticas P35 | 22min | 3 tasks | 1 files |
| Phase 09 P36 | 10min | 3 tasks | 4 files |
| Phase 09 P37 | 25min | 3 tasks | 3 files |
| Phase 09 P38 | 27min | 3 tasks | 6 files |
| Phase 09 P39 | ~50min | 3 tasks | 3 files |
| Phase 09-hist-rico-y-estad-sticas P40 | 20min | 3 tasks | 2 files |
| Phase 10 P01 | 45 min | 3 tasks | 9 files |
| Phase 10 P03 | 25 min | 3 tasks | 2 files |
| Phase 10 P04 | 35 min | 3 tasks | 3 files |
| Phase 10 P02 | 15min | 3 tasks | 5 files |

## Accumulated Context

### Roadmap Evolution

- v1.8 roadmap creado (2026-09-07): 6 fases (5 Catálogo, 6 Selección, 7 Contadores+compatibilidad, 8 Valores conocidos, 9 Histórico y estadísticas, 10 Firestore) — una fase más que el rango típico de la granularidad "coarse" configurada, deliberado: Histórico (9) y Firestore (10) se separan a propósito porque el histórico debe quedar verificado 100% offline antes de que Firestore exista en el código (evita el problema de doble fuente de verdad de raíz). COMP-01/COMP-02 (compatibilidad con sesiones de v1.7 ya desplegadas) se asignaron a la Fase 7, no a la 6, porque es ahí donde termina de fijarse la forma completa de `SessionContext` (selección + contadores) que debe convivir con el formato antiguo. COMP-03 (actualización de PWA ya instalada) se asignó a la Fase 10 por ser el cierre del hito. Decisión de arquitectura registrada en el propio ROADMAP.md: Firestore usa una marca `syncedToFirestore` propia en localStorage, no la persistencia offline integrada del SDK (`persistentLocalCache`) — mantiene la postura ya explícita del proyecto de no sumar IndexedDB para un trabajo de este tamaño.
- Phase 03.1 inserted after Phase 3: Voz pregenerada en español con Gemini TTS — la voz TTS del dispositivo se juzgó inaceptable en la prueba humana de la Fase 3 (URGENT)

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: research's 5-phase horizontal structure (engine → content → scaffold → components → enhancements) was restructured into 4 vertical MVP phases per user's chosen mode. Phase 1 delivers the pure-TS engine, Zod schema (with citation + speech fields from day one), Nuxt scaffold, tablet UI baseline, and verified setup content together — because the goal is a real tabletop playthrough of the setup flow, not a technical layer.
- Roadmap: rules verification is split by content scope, not done as one late QA pass — setup-rules verification lands in Phase 1, round-loop rules verification (including the 4 known draft errors: villain phase step count, obligation cadence, boost-card eligibility, Expert vs Heroic) lands in Phase 2.
- Roadmap: speech (VOZ-*) and wake lock (UI-06/07/08) deferred to Phase 3, offline PWA (OFF-*) deferred to Phase 4 — both are progressive enhancements that must never block the core "Siguiente" flow, and both need on-device verification (target tablet model/OS still unknown — resolve before Phase 3 planning).
- [Phase 01]: 01-01: directorio de publicacion real confirmado como .output/public (resuelve la asuncion A1 de 01-RESEARCH)
- [Phase 01]: 01-01: Inter quedo autoalojada de verdad (woff2 variable, subset latin) en vez de quedar en fallback
- [Phase 01]: 01-07: resolveText() siempre devuelve las tres claves de TextBlock (text/warning/speech), con undefined explicito cuando ni la variante ni el base las definen
- [Phase 01]: 01-07: jumpTo() con runtimeId inexistente devuelve la misma referencia de sesion (no-op), sin clonar
- [Phase 01]: 01-08: position/sectionLabel se derivan del nodo actual (kind==='step'/sectionTitle), nunca codificadas contra el id 'setup'
- [Phase 01]: 01-08: el runner monta las tres bandas bajo ClientOnly con fallback 'Cargando...' desde ya, aunque hoy el contexto de sesion es un STUB determinista sin localStorage
- [Phase 01]: 01-08: nitro.prerender.crawlLinks=false y routes limitado a /marvel-champions hasta que 01-02 aporte app/pages/index.vue
- [Phase 01]: 01-02: ADAPT-02 implementado segun D-10 (cabecera, no texto de paso); REQUIREMENTS.md queda pendiente de reescritura en transicion de fase
- [Phase 01]: 01-02: nuxt.config.ts recupera / en nitro.prerender.routes junto a /marvel-champions; crawlLinks se mantiene false porque la navegacion usa navigateTo() sin href real
- [Phase 01]: 01-03: Open Question 1 (nº de cartas del conjunto de Archienemigo) resuelta con texto generico sin cifra, porque el Rules Reference no da una cifra universal
- [Phase 01]: 01-03: el paso fusionado 21 (habilidades de Preparacion + jugador inicial) se mantiene como un solo paso reescrito de forma mas compacta en vez de dividirse, para respetar el total duro de 21 pasos
- [Phase 01]: 01-03: gate de citation en engine/__tests__/content.test.ts corregido para exigirla solo en kind:step, nunca en kind:summary
- [Phase 01]: 01-04: resume() nunca resuelve runtimeId ante desajuste de formatVersion/contentVersion, aunque el id siga existiendo (Anti-Patron 4)
- [Phase 01]: 01-04: usePersistedSession.ts es la unica costura de localStorage de toda la app; clear() asigna null (no cadena vacia) para que useLocalStorage dispare removeItem real
- [Phase 01]: 01-04: session.value se asigna en cuanto onMounted resuelve resumed/content-changed; lo que se pospone hasta la eleccion del usuario es que se pinta, no el calculo de la sesion candidata
- [Phase 01]: 01-05: MesaListaScreen implementa su propia cabecera de 64px en vez de reutilizar AppHeader, porque el mockup exige heading Mesa lista en Heading 28/700 distinto del sectionLabel en Label 18/700
- [Phase 01]: 01-05: tableOfContents() agrupa por phaseId consecutivo (posicion en el array), nunca por mapa/clave, para no romper si una fase apareciera dos veces
- [Phase 01]: 01-06: D-04 (granularidad) y la Open Question 2 (orden de bloques) aprobadas sin cambios por el usuario tras el playtest completo
- [Phase 01]: 01-06: tres correcciones de fidelidad de reglas detectadas por revision humana del usuario, no por la reverificacion automatica: reescritura de 'etapas de villano' (paso 15), division del paso 16 por omitir la multiplicacion por jugadores y el 'Cuando se revela', y eliminacion de una regla fantasma (setup.archienemigos.02, 'contar las cartas') sin respaldo en el Rules Reference
- [Phase 01]: 01-06: TECH-05 completado como 'preparado, no desplegado' por decision explicita del usuario; netlify.toml reverificado contra una build real, publicacion diferida
- [Phase 03]: 03-05: revision humana bloqueante en tablet real aprobo los 4 criterios de exito del ROADMAP sin pedir ninguna correccion de contenido; contentVersion se mantiene en 11
- [Phase 03]: 03-05: calidad de la voz TTS del dispositivo por defecto juzgada mala por el usuario (API de Gemini disponible); registrado como seguimiento fuera de alcance para una fase o quick futura
- [Phase 03.1-01]: Usuario eligió el estilo plano-agil (4a variante añadida durante el checkpoint D-02); A1 y modelo/SO de la tablet siguen sin verificar (escucha ocurrió en portátil) — bloqueante trasladado a 03.1-06
- [Phase 03.1-04]: usePreloadedAudio adopta estrategia red-primero + Cache Storage como respaldo (inversion deliberada del orden de RESEARCH.md); routeRule de /audio/** anade max-age=0, must-revalidate — Un clip regenerado reescribe la misma URL de fichero (sin huella en el nombre); con cache-primero un clip regenerado nunca volveria a descargarse — mismo razonamiento del stale service worker trap ya aplicado a /sw.js
- [Phase 03.1-05]: resolveEffectiveAvailability combina audioAvailable + spanishVoiceAvailable — el control de silencio nunca cae en 'unavailable' con audio pregenerado disponible; la banda de la Fase 3 solo aparece si fallan las dos fuentes (D-07/D-08)
- [Phase 03.1-05]: el cuerpo integro de announce() de la Fase 3 (guardas, cancel/speak, watchdog G-01) se extrajo TAL CUAL a speakFallback() sin cambiar ninguna linea de esa logica ya verificada en dispositivo real
- [Phase 08]: 08-03: D-08 el sufijo se interpola en el MISMO nodo de texto que actionText, sin span ni text-accent
- [Phase 08]: 08-03: D-09/D-32 la lista de valores es un div, nunca un button — sin chevron, sin click, sin aria-label
- [Phase 08]: 08-03: D-10 sin rótulo (a diferencia de ELECCIÓN/Opciones)
- [Phase 08]: 08-03: D-14/D-15 stepValueRows es null (no array vacío) cuando no hay ninguna fila conocida
- [Phase 08]: 08-03: checkpoint humano de Task 3 aprobado (Aprobado!) — los 8 puntos de legibilidad confirmados; recuento real de audio es 35 clips, no 37 (dato heredado del ROADMAP ya erróneo)
- [Phase 09-12]: buildHistoryEntry normaliza difficulty/playerCount/round en origen (mismo criterio que durationMs); appendHistoryEntry se somete a isGameHistoryEntry antes de escribir — cierra el BLOCKER de CR-01 ronda 2
- [Phase 09-12]: isGameHistoryEntry valida round/playerCount/durationMs con Number.isFinite en vez de typeof === 'number' (WR-03)
- [Phase 09]: Task 1/3 (09-24): typescript@^5.9.3 + vue-tsc@^3.3.11 instalados; opcion-a aplicada tras un primer barrido con 0 errores, así que el alcance del typecheck queda el que Nuxt genera de fábrica
- [Phase 09-25]: readProgress (usePersistedSession.ts) distingue read:'ok'/position:null (lectura correcta, sin posicion utilizable) de read:'failed' (no se pudo leer); load() se reescribe como envoltorio de readProgress, misma firma y comportamiento
- [Phase 09-25]: readStoredProgress (useStoredProgress.ts, nuevo) es la autoridad unica de lectura del progreso: expand()+readProgress()+resume() reproducen los tres pasos de onMounted; StoredProgress='resumable'|'absent'|'unknown', invariante stored==='resumable' equivale a outcome!=='fresh'; plan aditivo, sin consumidores todavia — el gap de la ronda 5 sigue abierto hasta 09-26
- [Phase 09-25]: test de useStoredProgress carga el fixture tiny-game.json con import de modulo JSON (resolveJsonModule) en vez de readFileSync/fileURLToPath (patron de audio-ids.test.ts), porque node:fs/node:url no tienen tipos bajo app/** sin @types/node y ese arbol si pasa por npm run typecheck (09-24)
- [Phase 09]: 26: planGameEnd(historyRecorded, stored) tipado contra StoredProgress (nunca boolean); cierra WR-01/WR-09 de 09-REVIEW.md y el BLOCKER de la ronda 5
- [Phase 09-27]: HIST-06 vuelve a [ ] en REQUIREMENTS.md — un requisito no se remarca porque un plan diga haberlo cerrado, sino cuando una ronda de verificación lo confirme; la nota nombra readStoredProgress/StoredProgress/planGameEnd como autoridad real
- [Phase 09-27]: cuatro diferidos nuevos (WR-04/05/06/02, ronda 4) en deferred-items.md con justificación de RIESGO, nunca de alcance de plan; Q5 añadida a 09-AUDIT-AFIRMACIONES-UI.md como la pregunta de método que habría cazado la ronda 5
- [Phase 09]: 09-32: NOTICE_BODY['failure-stale'] reescrita retirando anterioridad temporal y diferencia de ronda (alternativa A elegida sobre B: motivo estructurado en esLaMismaPartida rechazado por multiplicar la superficie de afirmación sin cambiar la acción del grupo) — buildHistoryEntry solo lee round/context; en el escenario canonico donde solo difiere runtimeId el registro seria identico con o sin motivo estructurado
- [Phase 09]: 09-32: AFIRMACIONES_AUDITADAS movida de app/pages/[game]/index.vue a app/composables/useGameEndCopy.ts (arreglo minimo de Gate A/C, autorizado por el scope_boundary del plan) — la copy movio de sitio real (endGameBody/discardBody ahora son funciones puras en useGameEndCopy.ts), asi que la auditoria tenia que moverse con ella o quedaria una excepcion sin uso
- [Phase 09]: 09-33: Set<string> de módulo (no localStorage) para la marca de discrepancia de progreso — una tercera escritura justo después de dos fallidas sería la menos fiable del sistema — Una marca que no se puede escribir en su propio escenario no es una mitigación; el límite aceptado (recarga completa la pierde) se documenta como deuda explícita del plan 09-36
- [Phase 09]: 09-33: texto provisional en la Task 1 GREEN, definitivo con respaldo oración a oración en la Task 3 (su propio ciclo RED->GREEN) — Evita un unexpected GREEN en la Task 3 al escribir el texto final desde el principio
- [Phase 09]: 09-34: Gate A/B pasa de vocabulario cerrado (11 subcadenas) a raices lexicas (10), con test de subsuncion; decision extraida a frasesSinAuditarDe (funcion pura) para que el plan 09-35 la ejerza
- [Phase 09]: 09-34: AFIRMACIONES_AUDITADAS pasa a {raiz, motivo, respaldo} con gate respaldoExiste; index.vue confirmado sin ninguna excepcion, ref avisoProgresoAjeno renombrado a avisoDiscrepancia (ruido de identificador, no copy)
- [Phase 09]: 09-34: Gate B concatena NOTICE_HEADING+NOTICE_BODY (no el spread propuesto por la verificacion, que perderia los titulares); Gate C vigila tambien 'success'; WR-10 cerrado
- [Phase 09]: 09-35: Gate S deja de auto-verificar solo regionVigilada y pasa a llamar directamente a frasesSinAuditarDe/variantesSinRespaldoDe/respaldoExiste; cuatro mutaciones EJECUTADAS y revertidas confirman que se pone rojo (vias (a)-(e) de 09-VERIFICATION.md ronda 8 cerradas)
- [Phase 09]: 09-35: variantesSinRespaldoDe (decision de Gate B) extraida con RED->GREEN real (stub -> implementacion), verificado con gsd_run check tdd-red-evidence (RED_EVIDENCE_OK); Tasks 1/3 documentadas como excepcion justificada de la Fail-Fast Rule #1 de tdd.md porque ejercitan funciones ya correctas desde el plan 09-34
- [Phase 09]: 09-36: REQUIREMENTS.md registra la octava cara de la ronda 7 sin cerrar HIST-06 (queda [ ] a la espera de una ronda de verificación independiente); ROADMAP.md a 36/36 planes sin declarar la Fase 9 verificada
- [Phase 09]: 09-36: la deuda de la marca en memoria de progreso (useProgressMismatchMark.ts) queda documentada en deferred-items.md como riesgo evaluado, con accion sugerida concreta (clave tga:progress-mismatch:<gameId> en el siguiente arranque con exito), nunca como fuera de alcance de plan
- [Phase 09]: 09-37: vocabulario de raíces léxicas movido a vocabularioDeAfirmaciones.ts, compartido por los dos gates sin copias (T-09-37-02) — Evita que las dos implementaciones diverjan en silencio, exactamente la clase de defecto que este cierre de hueco existe para prevenir
- [Phase 09]: 09-37: HIST-04/HIST-06 NO se marcan completados en REQUIREMENTS.md — el scope_boundary del plan lo prohíbe explícitamente — El gate nuevo queda ROJO a propósito (CR-01/WR-01); el arreglo es el plan 09-38 y la confirmación es una ronda de verificación independiente, no este plan
- [Phase 09]: 09-38: huella incluye los siete campos de PersistedPosition (updatedAt incluido); Map<gameId,huella> con testigo obligatorio en el lector; ninguno de los dos gates de 09-37 se edita en este plan (reservados a 09-39 por scope_boundary) aunque el arreglo introduce 5 tests rojos confinados a esos dos ficheros (self-tests de fixture obsoletos + Gate A false-positive), documentados en deferred-items.md y .planning/WINDOWS.md
- [Phase 09]: 09-39: respaldoRespaldaA/motivoNombraAlgoComprobable cierran WR-02/WR-03 del mecanismo de excepcion auditada; MARCAS_CON_REFERENTE_NO_PERSISTENTE gana raiz para reusar respaldoRespaldaA; el it de cierre de cobertura exige >=2 ocurrencias (cita + it real), nunca .toContain simple; npm test vuelve a 0 fallos (arreglados Gate A/useStoredProgress.ts y 4 self-tests de fixture heredados del plan 09-38); HIST-06 sigue [ ] por scope_boundary explicito
- [Phase 09]: 09-40: deferred-items.md corrige la evaluacion de riesgo de la marca en memoria (useProgressMismatchMark.ts) distinguiendo Caso A (se pierde, aceptado) de Caso B (persiste incorrecta, cerrado por 09-38); registra el camino de perdida nuevo por updatedAt en la huella como coste conocido
- [Phase 09]: 09-40: REQUIREMENTS.md gana el parrafo Ronda 8 y sincroniza HIST-04/HIST-06 con los planes 09-37..09-40; HIST-06 sigue [ ] y DEV-02 sigue abierta con el punto nuevo de ContentChangedNotice.vue - la confirmacion queda para una ronda de verificacion independiente; fase 09 (40/40 planes) queda cerrada por completo, pendiente de una ronda de verificacion independiente
- [Phase 10]: [Phase 10]: 10-01: firebase@^12.19.0 aprobado por el usuario tras checkpoint de legitimidad (veredicto SUS/too-new, falso positivo esperado de un SDK oficial de alta cadencia); instalado en dependencies, nunca devDependencies
- [Phase 10]: [Phase 10]: 10-01: D-03 (id local como id de documento) y D-10 (coleccion plana history/{id} con uid como campo) confirmados por el usuario en el checkpoint de puerta de un solo sentido antes de escribir la Task 3
- [Phase 10]: [Phase 10]: 10-01: syncPending fusiona (union) los ids recien subidos con loadSyncedIds() existentes antes de saveSyncedIds — nunca sobrescribe con solo el lote de esta pasada; la poda perezosa de D-04 (descartar ids que ya no esten en tga:history) queda fuera de alcance de este plan, no se implemento
- [Phase 10]: 10-03: D-04 poda perezosa vive en useHistorySync.ts (syncPending), nunca en usePersistedSession.ts — se filtra por loadHistory() releida al final del recorrido, no por la lectura inicial de flush(), para que un borrado en /historico mientras el flush está en vuelo también se refleje
- [Phase 10]: 10-03: rastro diagnosticable de fallos de sync solo bajo import.meta.dev y solo con error.code (nunca el objeto de error completo), un unico console.warn en todo el fichero
- [Phase 10]: 10-04: presupuesto de bundle (340 KiB) fijado tras medir npm run generate real de la Fase 10 completa (308668 bytes), nunca estimado a priori
- [Phase 10]: 10-04: test de fin de partida sin red elige villano y héroe (Rhino/Thor) para que /estadisticas renderice datos reales, no su propio estado vacío
- [Phase 10]: [Phase 10]: 10-02: proyecto real tabletop-assistant-f637e con firestore.rules create-only desplegado; base de datos recreada en eur3 (nam5 fue creada por accidente por el primer deploy, se borro y recreo con la base aun vacia)
- [Phase 10]: [Phase 10]: 10-02: checkpoint bloqueante de Task 3 aprobado por el usuario tras comparar caracter a caracter el texto publicado en la consola contra firestore.rules committeado, confirmar auth anonima habilitada, y aceptar por escrito la limitacion de validacion de players[] (T-10-09)

### Pending Todos

None yet.

### Blockers/Concerns

- Target tablet model/OS version is unknown — blocks confident verification of Web Speech es-ES voice availability, iOS TTS gesture requirement, and Wake Lock support. Resolve before planning Phase 3.
- `@vite-pwa/nuxt` compatibility with Nuxt 4.5.x is inferred, not directly confirmed — worth a five-minute spike early in Phase 1's Nuxt scaffold work.
- 03-05: el modelo y version de SO/navegador de la tablet de mesa siguen sin conocerse pese a la prueba humana (el humano no lo reporto); el sub-check sin voz espanola (segundo dispositivo) queda no verificado; y la calidad de la voz TTS por defecto del dispositivo se juzga mala, seguimiento para fase o quick futura (posible API externa, Gemini disponible)
- 03.1-03 RESUELTO (2026-08-31): los 37 clips estan generados. El desbloqueo NO fue el reinicio diario de cuota sino activar facturacion (el usuario anadio saldo); el primer intento aun fallo con `429 Your prepayment credits are depleted` porque el saldo no habia llegado al proyecto de la clave, y el segundo intento genero los 28 restantes del tiron. Verificado: 37 ficheros .m4a (27 setup.* + 10 ronda.*), ninguno de 0 bytes, 37 entradas en scripts/voice/manifest.json, 1,4 MB en total, 278 tests en verde.
- 03.1-03 PENDIENTE TRAS LA GENERACION: los 28 .m4a nuevos y el manifest.json modificado siguen SIN COMMITEAR. Son 1,4 MB de assets que cuestan dinero real regenerar. Commitearlos antes de nada.
- 03.1 DESVIACION AUTORIZADA POR EL USUARIO (2026-08-31): las olas 3 y 4 (planes 03.1-04 precarga y 03.1-05 reproduccion) se ejecutan ANTES de que 03.1-03 este completo, saltandose el `depends_on` del grafo verificado. Motivo: un clip ausente es un estado soportado por diseno (D-07, respaldo silencioso), asi que la integracion se puede construir y probar contra los 9 clips ya generados sin gastar cuota. Al completar el lote solo quedara generar clips y escribir el gate de deriva, ninguna feature. Al verificar la fase hay que comprobar que 03.1-03 quedo cerrado del todo (37 clips + gate) antes de dar la fase por buena.
- 03.1 ESTADO (actualizado 2026-08-31 tras generar los 37 clips): olas 1, 3 y 4 completas (planes 03.1-01, 02, 04, 05).
  REANUDAR ASI: (1) commitear los 28 .m4a + manifest.json; (2) completar Task 2 de 03.1-03 (gate de deriva, plantilla en engine/__tests__/content.test.ts) — ya es posible, el lote esta completo; (3) ejecutar el plan 03.1-06 (limpieza de public/voice-probe.html y public/audio/_probe/, verificacion de despliegue y prueba humana bloqueante en la tablet real).
  CRITERIOS DIFERIDOS que el verificador debe re-comprobar al cerrar la fase: recuento de 37 clips en la salida de `nuxt generate`; grep de la cabecera /audio/** en .vercel/output/config.json; "cada paso suena con clip real" (los 37 ids ya lo cumplen en disco, falta comprobarlo en build); y toda la verificacion en dispositivo real de reproduccion, corte a mitad de clip, silencio y offline.

- 03.1-01: el checkpoint de estilo D-02 se escucho en el PORTATIL, no en la tablet. La asuncion A1 de RESEARCH.md (`<audio>.play()` dentro del gesto tactil) sigue SIN verificar en el dispositivo real, y el modelo/SO de la tablet sigue sin conocerse. Todo el riesgo recae ahora en la prueba humana del plan 03.1-06.
- 260831-fkb: el Rules Reference v1.7 p. 39 dice explicitamente que un personaje puede intentar una accion bloqueada por un Estado (atacar, retirar amenaza) aunque no tenga objetivo valido, solo para descartar ese Estado — el detalle tactico mas util de la regla de Estados, no incluido en `optionsWarningDetail` por el limite de 320 caracteres. Sitio natural para retomarlo: un aviso propio (mismo patron `optionsWarning`/`optionsWarningDetail`) en el paso de atacar o de retirar amenaza.
- 260831-g2s: `IndexOverlay` no escucha Escape, a diferencia de `WarningDetailModal`. Se dejo fuera de alcance del quick de atajos de teclado (D-Q4: "desactivado con overlay abierto" no implicaba anadir cierre por Escape a todos los overlays). Candidato a quick futura si se decide homogeneizar el cierre por teclado de los overlays.

- Cierre del hito v1.8: la tabla de cobertura de `.planning/REQUIREMENTS.md` sigue marcando SEL-01…SEL-09 como «Pendiente» pese a que la Fase 6 los verificó (PROJECT.md los lista como Validated). Es contabilidad desfasada, no trabajo abierto — barrer al ejecutar `/gsd-complete-milestone v1.8`. Ojo: ese fichero entra en el `covered_files` de `10-VERIFICATION.md`, así que editarlo vuelve a marcar la verificación como `stale` y exige re-sellar el fingerprint.

## Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
| --- | ------------- | ------ | -------- | -------- | ----------- |
| 1 | Quick ID: 260831-fkb · Regla de cartas de Estado: `optionsWarningDetail` de extremo a extremo, regla de Estados autorada en `ronda.jugadores.01`, aviso de `ronda.villano.02` coherente con su detalle · Link: [260831-fkb-regla-cartas-de-estado](./quick/260831-fkb-regla-cartas-de-estado/) | 2026-08-31 | 3b2db30 | — | — |
| 2 | Quick ID: 260831-g2s · Atajos de teclado: Espacio/Enter avanzan y flecha izquierda retrocede en la pantalla de juego (portátil), decisión extraída a funciones puras testeadas, cero cambios en la interfaz táctil · Link: [260831-g2s-atajos-de-teclado](./quick/260831-g2s-atajos-de-teclado/) | 2026-08-31 | 46b0003 | — | — |
| 3 | Quick ID: 260831-umh · Botón «Partida terminada» en el overlay del índice: confirma, borra el progreso guardado y vuelve al inicio — la pantalla de juego ya no era una trampa sin salida en PWA · Link: [260831-umh-boton-partida-terminada-para-volver-a-ho](./quick/260831-umh-boton-partida-terminada-para-volver-a-ho/) | 2026-08-31 | 795e6d0 | — | — |
| 4 | Quick ID: 260901-jg1 · Fusión de `setup.archienemigos.01`+`.02` en un solo paso «Localizad y apartad fuera de la partida vuestro conjunto de Archienemigo (Némesis)» con aviso conservado, contentVersion 12→13, clip de audio regenerado y huérfano retirado · Link: [260901-jg1-fusionar-pasos-de-apartar-el-conjunto-de](./quick/260901-jg1-fusionar-pasos-de-apartar-el-conjunto-de/) | 2026-09-01 | 5e8f03a | — | — |
| 5 | Quick ID: 260902-0oz · Renombradas las 5 referencias a «carta/mazo de escenario» como Plan Principal (RR Apéndice II pasos 8/10/12a/12b), «cara B»→«cara 1B», 5 clips de voz regenerados, contentVersion intacto (solo texto, ids sin cambios) — pendiente escucha humana de la pronunciación · Link: [260902-0oz-renombrar-las-referencias-a-la-carta-y-m](./quick/260902-0oz-renombrar-las-referencias-a-la-carta-y-m/) | 2026-09-02 | 8913673 | — | — |
| 260923-3ri | CR-03: variante Experto de setup.escenario.04 cierta para Rhino, Ultron y Kang + clip regenerado (ffmpeg) | 2026-09-23 | 411cb73 | — | .planning/quick/260923-3ri-cr-03-planning-todos-pending-cr-03-experto-sustitucion-carta |
| 260923-3rj | WR-02 fase 10: tope de tiempo en todas las llamadas de red del respaldo | 2026-09-23 | 3edb0a3 | — | .planning/quick/260923-3rj-wr-02-fase-10-planning-todos-pending-wr-02-sin-timeout-en-ll |
| 260923-3rk | WR-03: el SDK de Firebase deja de precachearse en Workbox (715 KB menos) | 2026-09-23 | dc8ad79 | — | .planning/quick/260923-3rk-wr-03-planning-todos-pending-wr-03-workbox-precachea-el-sdk |
| 260923-3rl | Deuda INFO de la Fase 9 (IN-04/05/07/11/12/13) | 2026-09-23 | b33c6e3 | — | .planning/quick/260923-3rl-phase-9-info-debt-in-planning-phases-09-hist-rico-y-estad-st |
| 260923-3rm | WARNINGs abiertos de la Fase 9: franja de avisos, trampa de foco, ilegibles, duración congelada, leyendas por tabla | 2026-09-23 | 0b4349b | — | .planning/quick/260923-3rm-phase-9-open-warnings-in-planning-phases-09-hist-rico-y-esta |
| 260923-3rn | Gate de invariantes de la Fase 9: Pata 6 (retirada explícita) y huecos de parsing WR-01/WR-02 | 2026-09-23 | 9f4b893 | — | .planning/quick/260923-3rn-phase-9-gate-follow-ups-add-a-test-that-fails-if-onresumecon |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| requisito | VOZ-08: respaldo silencioso (D-07) nunca observado en dispositivo | abierto | 2026-08-31 |
| verificación | Fase 2: foco del modal de detalle en iPad/Safari real | abierto (necesita iPad) | 2026-08-31 |
| entorno | Modelo y SO/navegador de la tablet de mesa — sin identificar desde la Fase 1 | abierto | 2026-08-31 |
| verificación | Control de silencio nunca ejercitado en dispositivo | abierto | 2026-08-31 |
| threat model | voice-probe.html devuelve 200 por el fallback 200.html de Nuxt; el 404 literal no es alcanzable, el riesgo real sí está cerrado | aceptado | 2026-08-31 |
| proceso | CONT-09 marcado con matiz: cubre el 100% del contenido existente pero no es auditoría de tercero | aceptado | 2026-08-31 |

## Session Continuity

Last session: 2026-09-23T00:30:33Z
Stopped at: Phase 10 verificada (UAT 17/17, 0 incidencias) — hito v1.8 listo para cerrarse
Resume file: None
