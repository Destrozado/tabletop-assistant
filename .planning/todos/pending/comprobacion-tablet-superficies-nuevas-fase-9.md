---
id: comprobacion-tablet-superficies-nuevas-fase-9
created: 2026-09-23
source: 09-VERIFICATION.md ronda 11 (human_needed) — quick 260923-3rm
severity: warning
area: verificación humana
status: pending
---

# Comprobar en la tablet real las tres superficies nuevas de la Fase 9

El quick `260923-3rm` cambió tres cosas visuales que nunca se han visto en un dispositivo físico.
Los tests automáticos pasan (1284 vitest, 47 Playwright), pero el solape visual, el orden real del
foco y la legibilidad a un brazo de distancia solo se pueden juzgar en la tablet horizontal.

## Qué mirar

1. **Franja de avisos en flujo (`app/app.vue`)** — con «Nueva versión disponible» y el aviso de
   partida guardada a la vez: ningún control queda tapado, se apilan uno bajo otro y la pantalla
   de juego encoge en vez de solaparse.
2. **Diálogo de fin de partida (`GameOutcomeDialog`)** — pulsar Tab repetidamente: el foco no sale
   del diálogo; al cerrarlo vuelve a un control visible.
3. **Histórico ilegible (`/historico`, `/estadisticas`)** — con un `tga:history` corrupto: el
   estado se explica, el botón «Apartarlo y empezar uno nuevo» es alcanzable y el mensaje de
   resultado no desaparece al archivar.

Hecho esto, volver a ejecutar `/gsd-verify-work 9` para pasar la Fase 9 de `human_needed` a `passed`.
