---
id: gate-invariantes-evasiones-adyacentes
created: 2026-09-23
source: quick 260923-3rn (registradas en deferred-items.md de la Fase 9, sección «Huecos de parsing»)
severity: info
area: gate de invariantes (Fase 9)
status: pending
---

# Tres evasiones adyacentes del gate de invariantes de marca de estado

`app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts` cerró WR-01/WR-02 (quick
`260923-3rn`), pero quedan tres huecos del mismo tipo. Ninguno se explota hoy en el árbol:

1. El estado de módulo declarado con `export const` / `export let` no se descubre.
2. Contenedores fuera del regex de descubrimiento (`shallowRef`, `reactive`, `WeakMap`, literales
   de array u objeto) no se descubren.
3. Una coma dentro de un literal de cadena cuenta como argumento extra (`lector('a, b')` → 2): el
   mismo sentido de falso verde que WR-01.

Buen candidato para un `/gsd-quick`, con una mutación ejecutada y revertida por cada hueco.
