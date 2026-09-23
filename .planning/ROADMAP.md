# Roadmap: TableGameAssistant

## Milestones

- ✅ **v1.7 — Asistente de Marvel Champions jugable de principio a fin** — Fases 1-4 (enviado 2026-08-31)
- ✅ **v1.8 — Elección de personajes, contadores en mesa e histórico de partidas** — Fases 5-10 (enviado 2026-09-23)

---

### v1.7 — Asistente de Marvel Champions jugable de principio a fin ✅

**Enviado:** 2026-08-31 · **5 fases, 30 planes** · 60/61 requisitos · [Archivo completo](milestones/v1.7-ROADMAP.md) · [Requisitos](milestones/v1.7-REQUIREMENTS.md)

Un grupo puede jugar una partida completa de Marvel Champions sin abrir el reglamento: motor de flujo de 33 pasos verificado contra el Rules Reference v1.7, locución en español pregenerada con Gemini TTS, y PWA instalable que funciona sin conexión. Desplegado en https://tabletop-assistant.vercel.app/ y en uso real.

**Deuda conocida al cierre** (detalle en el archivo): VOZ-08 (respaldo silencioso) nunca probado en dispositivo; el ítem de foco del modal en iPad/Safari de la Fase 2; el modelo y SO de la tablet de mesa, sin identificar desde la Fase 1; el control de silencio sin ejercitar en dispositivo. Las verificaciones de las fases 2, 03.1 y 4 quedan en `human_needed`, no en `passed`.

---

### v1.8 — Elección de personajes, contadores en mesa e histórico de partidas ✅

**Enviado:** 2026-09-23 · **6 fases, 72 planes, 170 tareas** · 58/58 requisitos · [Archivo completo](milestones/v1.8-ROADMAP.md) · [Requisitos](milestones/v1.8-REQUIREMENTS.md) · [Auditoría](milestones/v1.8-MILESTONE-AUDIT.md) · [Fases](milestones/v1.8-phases/)

El grupo elige villano, héroes y nombres en el paso de preparación a partir de un catálogo legal de 23 héroes y 3 villanos. La vida de villano y héroes está en pantalla con ▲▼, y las cifras conocidas aparecen dentro del texto del paso. Al terminar, se registra el resultado en un histórico con estadísticas de % de victorias que funciona 100% sin conexión, y se respalda en Firestore sin bloquear nunca la partida. Las partidas guardadas por v1.7 siguen reanudándose.

<details>
<summary>Fases 5-10</summary>

- [x] Fase 5: Catálogo de héroes y villanos (6/6 planes) — completada 2026-09-07
- [x] Fase 6: Selección de villano, héroes y jugadores (7/7 planes) — completada 2026-09-08
- [x] Fase 7: Banda de contadores y compatibilidad de sesión (11/11 planes) — completada 2026-09-08
- [x] Fase 8: Valores conocidos dentro del paso (4/4 planes) — completada 2026-09-09
- [x] Fase 9: Histórico y estadísticas (40/40 planes) — completada 2026-09-22 · re-verificada 2026-09-23 en `human_needed` (5/5 en código)
- [x] Fase 10: Respaldo en Firestore (4/4 planes) — completada 2026-09-23 · re-verificada 2026-09-23 `passed` 12/12

</details>

**Deuda conocida al cierre** (detalle en la auditoría y en `.planning/todos/pending/`): la tablet real sigue sin ver las superficies nuevas de la Fase 9 (franja de avisos, trampa de foco, histórico ilegible); duda de reglas abierta sobre las etapas de Rhino/Ultron en Experto (sin el PDF del reglamento para contrastar); clip `setup.escenario.04.expert` regenerado con ffmpeg y aún sin escuchar; tres evasiones adyacentes del gate de invariantes; y el arrastre de dispositivo de v1.7.

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|-----------------|--------|-----------|
| 1. Motor de flujo, selector y preparación de mesa | v1.7 | 8/8 | Complete | 2026-08-28 |
| 2. Bucle de ronda y reglas verificadas | v1.7 | 5/5 | Complete | 2026-08-29 |
| 3. Locución por voz y pantalla siempre encendida | v1.7 | 5/5 | Complete | 2026-08-30 |
| 03.1. Voz pregenerada en español con Gemini TTS | v1.7 | 6/6 | Complete | 2026-08-31 |
| 4. Instalación y funcionamiento offline | v1.7 | 6/6 | Complete | 2026-08-31 |
| 5. Catálogo de héroes y villanos | v1.8 | 6/6 | Complete | 2026-09-07 |
| 6. Selección de villano, héroes y jugadores | v1.8 | 7/7 | Complete | 2026-09-08 |
| 7. Banda de contadores y compatibilidad de sesión | v1.8 | 11/11 | Complete | 2026-09-08 |
| 8. Valores conocidos dentro del paso | v1.8 | 4/4 | Complete | 2026-09-09 |
| 9. Histórico y estadísticas | v1.8 | 40/40 | Complete | 2026-09-22 |
| 10. Respaldo en Firestore | v1.8 | 4/4 | Complete | 2026-09-23 |

---

## Próximo milestone (tras v1.8)

Sin definir; arrancar con `/gsd-new-milestone`. Los candidatos están en «Candidatos para hitos posteriores» de `.planning/PROJECT.md`. El principal es Warhammer 40.000 como segundo juego, que sería la prueba real de si el motor y el esquema de contenido son de verdad agnósticos al juego. Sigue pendiente cerrar la deuda de dispositivo real (la tablet de mesa), heredada de v1.7 y ampliada en v1.8: todo se ha comprobado con viewport simulado, nunca en el dispositivo objetivo.
