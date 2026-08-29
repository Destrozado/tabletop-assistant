---
status: partial
phase: 02-bucle-de-ronda-y-reglas-verificadas
source: [02-VERIFICATION.md]
started: 2026-08-30T00:25:00Z
updated: 2026-08-30T00:25:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Foco del modal en un iPad real (Safari)

Abrir el modal de detalle (`⚠` o cualquier opción del turno) en un iPad real (Safari) y pulsar
SIGUIENTE o el botón `≡` mientras el modal sigue abierto, usando un teclado Bluetooth o VoiceOver
para navegar con Tab — el tap no mueve el foco en WebKit.

expected: El foco debería quedar atrapado dentro del modal (o el fondo debería quedar inerte), y al
cerrarlo el foco debería devolverse al botón que abrió el panel.
result: [pending]

why_human: Requiere un iPad/Safari real o un lector de accesibilidad; no se puede verificar con grep
ni con un test de Vitest en jsdom. El código (`WarningDetailModal.vue`, `app/pages/[game]/index.vue`)
confirma que no hay focus-trap y que el disparador se captura con `document.activeElement`, que es
`<body>` en WebKit. El comportamiento descrito en `02-REVIEW.md` WR-02/WR-03 está deducido del código
y confirmado por el verificador, pero su impacto real en un iPad físico no se ha probado en ningún
punto de esta fase: los playtests documentados en `02-CONTENT-REVIEW.md` se hicieron con `npm run dev`,
previsiblemente en un navegador de escritorio, donde los botones sí retienen el foco al pulsarlos.

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
