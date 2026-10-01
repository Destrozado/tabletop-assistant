---
phase: quick-261002-2am
plan: 01
status: complete
commits:
  - b01bde5 feat(motor): varios módulos recomendados y conjuntos fijos de escenario por villano
  - 9ecbd52 feat(catalogo): The Rise of Red Skull (trors) — Crossbones, Absorbing Man, Taskmaster, Zola, Red Skull y siete módulos
  - c6ce70e test(catalogo): villanos de Red Skull, recomendados múltiples, conjuntos fijos y módulos de packs de héroe
---

# Quick 261002-2am: Cráneo Rojo y módulos

Cinco villanos de The Rise of Red Skull (Crossbones, Absorbing Man, Taskmaster, Zola, Red Skull) y siete módulos nuevos en el catálogo.

- Esquema y motor: claves opcionales `additionalRecommendedModuleIds` y `fixedEncounterSetNames` (aditivas; los villanos existentes no cambian).
- Generador: filas nuevas, packs trors/jubilee/ncrawler/storm/nova, exclusiones exper_weapon/hydra_camp/expcamp, comprobaciones cruzadas ampliadas (varios módulos, conjuntos fijos, Experto desde el libro de reglas).
- JSON regenerado solo con `npm run catalogue:generate`: +176 líneas, 0 borrados.
- Tests: 1441 de Vitest en verde, typecheck 0.

## Deviations from Plan

None.

## Self-Check: PASSED
