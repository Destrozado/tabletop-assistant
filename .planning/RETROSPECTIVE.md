# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.8 — Elección de personajes, contadores en mesa e histórico de partidas

**Shipped:** 2026-09-23
**Phases:** 6 (5–10) | **Plans:** 72 | **Tasks:** 170 | **Commits:** ~525 (2026-09-07 → 2026-09-23) | **Código fuera de `.planning/`:** 103 ficheros, +22 064 / −193

### What Was Built
- Catálogo versionado, reproducible y legal de 23 héroes y 3 villanos (solo nombres y cifras), regenerable desde MarvelCDB y validado por Zod en CI (Fase 5).
- Selección de villano, héroe y nombre por jugador dentro del paso de preparación, opcional y persistente (Fase 6).
- Banda fija de vida de villano y héroes con ▲▼, dentro de un presupuesto de 96px medido antes de construirla, compatible con las partidas guardadas por v1.7 (Fase 7).
- Cifras conocidas entre paréntesis dentro del paso, sin reescribir contenido ni regenerar voz (Fase 8).
- Histórico de partidas y estadísticas de % de victorias, 100% offline (Fase 9, 40 planes).
- Respaldo silencioso en Firestore: SDK solo por `import()` dinámico, nunca bloqueante, reglas create-only desplegadas (Fase 10).
- Lote rápido de cierre `260923-3rh`: CR-03, WR-02, WR-03 y toda la deuda INFO/WARNING abierta de la Fase 9.

### What Worked
- **Ordenar las fases por la cadena real de dependencia de datos** (catálogo → selección → contadores → valores) y aislar Firestore en la última fase: el histórico quedó verificado offline antes de que existiera el respaldo, y ninguna fase posterior tuvo que reabrir una anterior por eso.
- **Medir antes de construir** (presupuesto de altura de la banda, matriz de 5 viewports × 4 jugadores con `elementFromPoint`) convirtió un bloqueante visual (CR-01 de la Fase 7) en un gate permanente.
- **Re-verificar en vez de re-sellar** cuando cambia código cubierto: la ronda 11 de la Fase 9 detectó que una evidencia antigua («Firestore no existe en el código») ya era falsa, aunque el invariante siguiera siendo cierto.
- **Lote rápido secuencial con dependencias explícitas** para cerrar deuda antes de la auditoría: 6 tareas y 22 commits sin conflictos, con la suite completa en verde tras cada una.

### What Was Inefficient
- **La Fase 9 necesitó 40 planes y 11 rondas de verificación.** El mismo defecto de fondo (copy que afirma sobre los datos del grupo algo que el código no comprueba) volvió con nueve caras distintas. Cada ronda cerraba la cara concreta encontrada en vez de la clase, y solo paró cuando se escribieron gates ejecutables sobre la clase (raíces léxicas + respaldo comprobable; ciclo de vida de marcas de estado).
- **La contabilidad se desincronizó:** SEL-01..09 quedaron como «Pendiente» en la tabla de trazabilidad durante todo el hito pese a estar verificados, y SEL-05 nunca entró en el `requirements-completed` de un SUMMARY.
- **La tablet real sigue sin usarse.** Todo v1.8 se verificó con viewport simulado; la deuda de dispositivo de v1.7 creció en vez de cerrarse.
- **Faltaba el PDF del Rules Reference en la máquina** al cerrar, así que una duda de reglas (etapas de Rhino/Ultron en Experto) no se pudo resolver y quedó como todo.
- Los planificadores del lote rápido declararon dependencias en ciclo (3rl↔3rm↔3rn); hubo que romperlo a mano.

### Patterns Established
- **Gates sobre la clase de defecto, no sobre el caso:** descubrimiento por glob, excepciones auditadas con motivo y respaldo cuyo contenido tiene que respaldar lo que se afirma, y mutaciones ejecutadas y revertidas como prueba de que el gate muerde.
- **Una sola autoridad de lectura** (`readStoredProgress`) compartida entre montaje y fin de partida, tipada para que confundir escritura con lectura rompa `npm run typecheck`.
- **`npm run typecheck` es la comprobación real de tipos:** `npx tsc --noEmit` en la raíz no comprueba nada (`files: []`).
- **Pendientes que necesitan una persona → `.planning/todos/pending/`**, con qué mirar y cómo cerrarlo, nunca como «hecho».
- Excluir del precache por marca de contenido (`@firebase/`) en `pwa:beforeBuildServiceWorker`, no por nombre de fichero (los chunks son `[hash].js`).

### Key Lessons
1. Cuando un hallazgo de revisión reaparece con otra cara, parar y escribir el gate de la clase antes de cerrar la cara siguiente. En la Fase 9 habría ahorrado unas cinco rondas.
2. Tener el PDF del Rules Reference a mano es condición previa de cualquier cambio de contenido, no un extra: la fidelidad de reglas es una restricción no negociable del proyecto.
3. Cerrar la contabilidad de requisitos (tabla de trazabilidad + frontmatter de SUMMARY) en la transición de cada fase, no al final del hito.
4. Agendar la sesión en la tablet real como tarea del hito, con fecha, en vez de dejarla como deuda que se arrastra.

### Cost Observations
- Model mix: planificación con opus; ejecución, verificación e integración con sonnet (perfil `balanced`).
- Sessions: múltiples a lo largo de 17 días; el cierre (lote rápido + re-verificación + auditoría + archivo) en una sola sesión desatendida.
- Notable: la Fase 9 concentra más de la mitad de los planes del hito (40/72).

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.7 | 5 (1–4 + 03.1) | 30 | Fase insertada urgente (03.1) tras una prueba humana bloqueante en dispositivo; revisión humana de reglas bloqueante por fase (D-36) |
| v1.8 | 6 (5–10) | 72 | Fases ordenadas por dependencia de datos; gates ejecutables sobre clases de defecto; lote rápido de cierre de deuda antes de auditar |

### Cumulative Quality

| Milestone | Unit tests (Vitest) | E2E (Playwright) | Verificación de fases |
|-----------|---------------------|------------------|------------------------|
| v1.7 | 293 (auditoría 2026-08-31) | 11 | 3 de 5 fases en `human_needed` |
| v1.8 | 1284 | 47 | 5 de 6 `passed`, Fase 9 `human_needed` |

### Top Lessons (Verified Across Milestones)

1. **La prueba en dispositivo real encuentra lo que ninguna revisión de código ve.** En v1.7 descartó la voz de síntesis; en v1.8 sigue pendiente y es la deuda que más crece.
2. **La fidelidad de reglas la sostiene una persona con el reglamento delante, no el esquema.** D-36 en v1.7; la duda de Experto sin resolver en v1.8 por falta del PDF.
