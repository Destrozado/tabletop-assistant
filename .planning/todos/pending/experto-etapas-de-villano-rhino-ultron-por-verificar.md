---
id: experto-etapas-de-villano-rhino-ultron-por-verificar
created: 2026-09-23
source: quick 260923-3ri (análisis de CR-03)
severity: high
area: fidelidad de reglas
status: pending
audit_acknowledged:
  milestone: v1.8
  at: 2026-09-23
---

# Por verificar: ¿Rhino y Ultron cambian de combinación de etapas en Experto?

## Pregunta (por verificar, no un hecho confirmado)

El Rules Reference v1.7, p. 28 (Modes of Play — Expert Mode), dice que en modo Experto se sigue
«using the listed expert mode villain stages», y la p. 48 (Appendix I — Encounter Decks) dice que
Experto «uses a different combination of villain stages and adds the expert encounter set». El
repo, en cambio, asume hoy que para Rhino y Ultron las etapas de villano NO cambian en Experto —
solo se añade el set de encuentros Experto:

- `engine/types.ts` (comentario sobre `VillainStage`): la ausencia de la clave `expert` en una
  etapa «es un hecho del dominio, no un dato pendiente: significa que el modo Experto de ese
  escenario no sustituye las cartas de villano numeradas (caso de Rhino y Ultron, villanos del
  Core Set)».
- `scripts/catalogue/fetch-marvelcdb.mjs` (comentario sobre `VILLAIN_STAGE_CARDS`): «Un villano
  SIN `expertCode` sale del catálogo sin ninguna clave `expert` — eso significa "el modo Experto
  de este escenario no sustituye sus cartas numeradas" (Rhino, Ultron), no "dato pendiente"».
- `engine/__tests__/characters.test.ts`, test «Rhino y Ultron: ninguna etapa lleva la clave
  expert»: confirma que el catálogo generado no trae ningún dato `expert` para estos dos villanos.

Y `engine/counters.ts` (`computeInitialVillainHealth`, D-11) precarga siempre la etapa I
(`villain.stages[0]`) al calcular el dial de vida inicial, sea cual sea la dificultad, salvo que
esa etapa tenga datos `expert` propios (que hoy solo Kang tiene).

**Pregunta concreta:** ¿la hoja de preparación del escenario de Rhino y de Ultron (Core Set)
indica para Experto una combinación de etapas de villano distinta de la estándar (por ejemplo,
empezar la partida en la etapa II en vez de en la etapa I)?

## Consecuencias SI se confirma que sí cambian

- La cifra del dial de vida en Experto para Rhino/Ultron sería la de la etapa I del catálogo, no
  la de la etapa con la que realmente se empieza la partida. Con los datos actuales del catálogo
  (`content/marvel-characters.json`), la diferencia por héroe sería: Rhino 14 (etapa I) frente a
  15 (etapa II); Ultron 17 (etapa I) frente a 22 (etapa II).
- La variante `normal` de `setup.escenario.04` («Dejad las cartas de villano numeradas tal como
  vienen con el escenario») podría quedarse corta si el modo estándar tampoco usa siempre las
  tres etapas tal cual vienen numeradas — no se ha verificado ese supuesto tampoco.

## Cómo verificarlo

- El PDF del Rules Reference v1.7 (p. 28 y p. 48; no está en el repo ni en esta máquina —
  `reference/*.pdf` está en `.gitignore`, ver `reference/README.md`), con
  `pdftotext -layout -f N -l N`.
- El reglamento o la hoja de preparación de escenario físicos del Core Set (Rhino y Ultron).

No tocar el motor ni el catálogo hasta confirmarlo con el reglamento.
