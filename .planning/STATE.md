---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: milestone
status: executing
stopped_at: Phase 3 UI-SPEC approved
last_updated: "2026-08-31T07:31:39.869Z"
last_activity: 2026-08-31
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 24
  completed_plans: 20
  percent: 60
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-28)

**Core value:** Que un grupo pueda jugar una partida completa de Marvel Champions de principio a fin sin abrir el reglamento y sin olvidarse de ningún paso.
**Current focus:** Phase 03.1 — voz-pregenerada-en-espa-ol-con-gemini-tts

## Current Position

Phase: 03.1 (voz-pregenerada-en-espa-ol-con-gemini-tts) — EXECUTING
Plan: 2 of 6
Status: Ready to execute
Last activity: 2026-08-31

Progress: [████████░░] 83%

## Performance Metrics

**Velocity:**

- Total plans completed: 18
- Average duration: — min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 8 | - | - |
| 02 | 5 | - | - |
| 03 | 5 | - | - |

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

## Accumulated Context

### Roadmap Evolution

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

### Pending Todos

None yet.

### Blockers/Concerns

- Target tablet model/OS version is unknown — blocks confident verification of Web Speech es-ES voice availability, iOS TTS gesture requirement, and Wake Lock support. Resolve before planning Phase 3.
- `@vite-pwa/nuxt` compatibility with Nuxt 4.5.x is inferred, not directly confirmed — worth a five-minute spike early in Phase 1's Nuxt scaffold work.
- 03-05: el modelo y version de SO/navegador de la tablet de mesa siguen sin conocerse pese a la prueba humana (el humano no lo reporto); el sub-check sin voz espanola (segundo dispositivo) queda no verificado; y la calidad de la voz TTS por defecto del dispositivo se juzga mala, seguimiento para fase o quick futura (posible API externa, Gemini disponible)

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none — first milestone)* | | | |

## Session Continuity

Last session: 2026-08-31T07:29:44.596Z
Stopped at: Phase 3 UI-SPEC approved
Resume file: None
