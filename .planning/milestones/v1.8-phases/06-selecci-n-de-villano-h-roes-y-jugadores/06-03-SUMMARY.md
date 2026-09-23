---
phase: 06-selecci-n-de-villano-h-roes-y-jugadores
plan: 03
subsystem: app-logic
tags: [seleccion-heroes, i18n-alias, revision-humana, d-07, d-36]
dependency-graph:
  requires:
    - 06-02-PLAN.md (escribió las 23 filas propuestas y la marca de PENDIENTE)
  provides:
    - app/data/spanish-hero-aliases.ts (confirmado contra las cartas físicas)
  affects:
    - 06-07-PLAN.md (depende de este plan; su verificación humana ya puede leer alias definitivos)
tech-stack:
  added: []
  patterns:
    - "Revisión humana bloqueante como tarea explícita del plan (dispositivo D-36), no como paso implícito"
key-files:
  created: []
  modified:
    - app/data/spanish-hero-aliases.ts
decisions:
  - "she-hulk pasa de «She-Hulk» a «Hulka» — única corrección de las 23"
  - "Ningún test citaba «She-Hulk» como dato de ejemplo, así que no hubo que tocar useHeroSearch.test.ts (el punto 4 del plan no llegó a aplicar)"
requirements: [SEL-05]
---

# Plan 06-03 — Revisión humana de los 23 alias en español (D-07)

**Estado:** completo · 2026-09-08
**Tareas:** 2/2

## Objetivo

Cerrar D-07: los alias en español los propuso Claude en el plan 06-02, pero es el
usuario quien los contrasta contra las cartas físicas del grupo antes de darlos por
definitivos. Es el mismo dispositivo que D-36 estableció para el contenido de reglas —
un gate automático detecta contenido *malformado*, nunca contenido *incorrecto*.

## Task 1 — Revisión humana (checkpoint bloqueante)

Se le imprimió al usuario la tabla completa de 23 filas (alias español · nombre inglés
del catálogo · alter ego), ordenada por el alias español, que es el orden en que
aparecen en el modal. 18 filas iban marcadas para confirmar; 5 coincidían con el
inglés y no admitían duda.

Se le plantearon las seis dudas que el plan lista (`deadpool`, `doctor-strange`,
`iceman`, `jubilee`, `spider-man`, y el trío `ms-marvel`/`she-hulk`/`ant-man`),
nombrando la alternativa concreta de cada una, y una séptima que el orquestador
detectó por su cuenta: **`06-CONTEXT.md` de la Fase 5 recogía textualmente que la
carta del grupo dice «Hulka»**, mientras el plan 06-02 había propuesto «She-Hulk».

### Veredicto del usuario (transcrito literalmente)

> «En mi carta tengo como alter ego "Jennifer Walters" y "Hulka" como Héroe. pero
> vamos que me da igual She-hulk que Hulka, lo importante es saber a quien nos
> referimos. aprobado!»

**Interpretación aplicada, y por qué:** el usuario aprueba las 23 y declara
indiferencia explícita en la única fila en disputa. Ante esa indiferencia se eligió
**«Hulka»**, por dos razones: es lo que dice literalmente su carta (dato que él mismo
aporta en la misma frase), y D-06 hace del nombre español el **rótulo dominante** de
cada fila del modal — es decir, el que se lee de un vistazo en la mesa, que es
exactamente el problema que este mapa existe para resolver (D-05: el problema es el
reconocimiento al hojear, no la búsqueda). Se le comunicó la elección y que revertirla
es un cambio de dos segundos.

El alter ego no se toca: `Jennifer Walters` ya venía correcto del catálogo, que es dato
derivado del script y no se edita a mano (D-09 de la Fase 5).

Ningún fichero se modificó durante esta tarea, como exige el plan.

## Task 2 — Aplicar las correcciones y retirar la marca de pendiente

1. **Corrección aplicada:** `'she-hulk': 'She-Hulk'` → `'she-hulk': 'Hulka'`. Única de
   las 23. Ninguna entrada se borró, así que las 23 claves siguen presentes y no hay
   ningún héroe cayendo al fallback inglés de D-05.
2. **Marcas retiradas:** las 18 apariciones de `// D-07: confirmar` eliminadas.
3. **Cabecera actualizada:** el bloque «⚠ PENDIENTE DE REVISIÓN HUMANA» se sustituyó
   por el registro de la revisión — fecha, que el usuario la contrastó contra las
   cartas físicas, y la corrección aplicada con sus palabras textuales. El resto de la
   cabecera queda intacto: D-05, la prohibición de entrar en
   `content/marvel-characters.json`, el fallback al nombre inglés y que la clave es el
   `id` del catálogo.
4. **Tests:** no hubo que tocar `useHeroSearch.test.ts`. El punto 4 del plan preveía
   actualizar datos de ejemplo si un alias corregido rompía algún caso, pero ningún
   test citaba «She-Hulk» como dato — los casos de filtro estaban escritos contra
   «Bruja Escarlata» y «Hombre de Hielo», ambos sin cambios. Cero aserciones de
   comportamiento modificadas.

## Verificación

| Gate | Resultado |
|---|---|
| `grep -c "D-07: confirmar"` | `0` ✓ |
| `grep -c "PENDIENTE"` | `0` ✓ |
| `grep -c "Revisión humana D-07"` | `1` ✓ |
| `grep -Ec "2026-0[0-9]-[0-9]{2}"` | `1` ✓ |
| Claves huérfanas contra el catálogo | ninguna, 23 claves ✓ |
| `npm test` | 19 ficheros / **465 tests** en verde ✓ |
| `git diff --name-only` | solo `app/data/spanish-hero-aliases.ts` ✓ |

## Desviaciones

Ninguna. El punto 4 de la Task 2 (actualizar datos de test) no llegó a aplicar porque
ningún test dependía del alias corregido; eso es el plan previendo un caso que no se
dio, no una desviación.

## Notas para fases posteriores

- El mapa ya no tiene ninguna marca de pendiente: **la Fase 7 y posteriores pueden
  leerlo como dato confirmado**.
- Sigue siendo dato de la capa de interfaz. Añadir un héroe al catálogo NO añade su
  alias automáticamente — cae al nombre inglés por el fallback de D-05, sin romper
  nada, y añadir el alias es un commit aparte en este fichero.
