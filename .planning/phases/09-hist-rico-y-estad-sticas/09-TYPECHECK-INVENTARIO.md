# Inventario del primer barrido de `npm run typecheck` — Plan 09-24, Task 2

**Fecha:** 2026-09-13
**Versiones instaladas** (decisión del usuario en la Task 1, opción `option-a`):
- `typescript@^5.9.3` (resuelto en `package-lock.json` como `5.9.3`)
- `vue-tsc@^3.3.11` (resuelto en `package-lock.json` como `3.3.11`, `peerDependencies: { typescript: ">=5.0.0" }`)

Justificación de la decisión (registrada aquí y en el SUMMARY): TypeScript 7 (`latest` en el
registro npm, hoy `7.0.2`) es la reescritura nativa en Go, con una superficie de API interna
distinta de la que consume `@volar/typescript` (la capa sobre la que `vue-tsc` está construido).
Que el rango `peerDependencies: { typescript: '>=5.0.0' }` de `vue-tsc@3.3.11` admita 7.x
formalmente no es prueba de que funcione — es exactamente la clase de garantía sin comprobar que
esta fase lleva cinco rondas persiguiendo. Se elige la última versión **de la línea 5.x**, la que
el ecosistema de `vue-tsc` 3.x usa de hecho, no la última publicada en términos absolutos.

## 1. Órdenes ejecutadas y su código de salida literal

```
$ npx nuxt prepare
◆  Types generated in .nuxt.
codigo de salida: 0

$ npm run typecheck
> typecheck
> nuxt typecheck
codigo de salida: 0
```

Verificación adicional para descartar que el código de salida 0 fuera un falso verde por
script no encontrado o binario ausente (invocando `vue-tsc` directamente contra el mismo
`tsconfig.json` que genera `nuxt prepare`):

```
$ npx vue-tsc --noEmit -p .nuxt/tsconfig.json
codigo de salida: 0
```

Los tests siguen en verde tras instalar el comprobador (comprobación exigida por los
`acceptance_criteria` de la Task 2):

```
$ npx vitest run
 Test Files  28 passed (28)
      Tests  796 passed (796)
codigo de salida: 0
```

## 2. Recuento total

**0 errores. 0 ficheros afectados por errores.**

`npm run typecheck` sale en verde en el primer barrido, sin que nadie haya tocado nada. No se
da esto por supuesto sin más: se ha confirmado con dos rutas distintas (`nuxt typecheck` y
`vue-tsc` directo contra el mismo `tsconfig.json` generado), y con `strict: true` activo en
`.nuxt/tsconfig.json` (confirmado por inspección: línea con `"strict": true` en el fichero
generado).

## 3. Tabla por fichero

No aplica — no hay ningún fichero con errores que listar. Tabla vacía a propósito, tal como
exige el `acceptance_criteria` de la Task 2 cuando el recuento es 0.

| fichero | nº de errores | códigos TS más frecuentes | descripción |
|---|---|---|---|
| _(ninguno)_ | — | — | — |

## 4. Clasificación en las tres categorías

- **RUIDO DE CONFIGURACIÓN:** ninguno en forma de error, pero sí un hallazgo de cobertura (ver
  §5 abajo) que es RUIDO DE CONFIGURACIÓN en sentido estricto: no habla del código, habla de qué
  parte del código el comprobador llega a mirar.
- **DEFECTO REAL LATENTE:** ninguno encontrado.
- **ESTRECHEZ DEL COMPROBADOR:** ninguno encontrado.

## 5. Hallazgo de cobertura (no es un error, pero condiciona la decisión de la Task 3)

`nuxt typecheck` no analiza "todo el repositorio": analiza el grafo de tipos que arranca en
`.nuxt/tsconfig.json`, cuyo `include` generado por Nuxt es `../app/**/*` (más `.nuxt/`,
`content/` y `nuxt.config.ts`). TypeScript añade a ese conjunto raíz cualquier fichero que se
importe transitivamente desde ahí — así es como `engine/` entra en el programa sin estar en
`include` — pero **lo que nada en `app/` importa nunca se queda fuera**, con error o sin él.

Comprobado con `vue-tsc --noEmit -p .nuxt/tsconfig.json --listFiles` (940 ficheros totales en el
programa, 847 de `node_modules`):

| Directorio | Ficheros `.ts`/`.vue` reales | Cubiertos por `npm run typecheck` | No cubiertos |
|---|---|---|---|
| `app/` | 47 (incluye 11 `*.test.ts`) | 47 | 0 |
| `engine/` (nivel superior, sin `__tests__/`) | 16 | 14 | 2: `engine/schema.ts`, `engine/catalogueSchema.ts` |
| `engine/__tests__/` | 17 (`*.test.ts`) | 0 | 17 |
| `e2e/` (specs de Playwright) | 7 | 0 | 7 |
| raíz (`playwright.config.ts`, `vitest.config.ts`) | 2 | 0 (`nuxt.config.ts` sí está cubierto) | 2 |
| `scripts/**/*.mjs` | — (no son `.ts`) | — | no aplica, fuera del alcance de un comprobador de tipos TS |

Detalle de los dos ficheros de `engine/` no cubiertos: `engine/schema.ts` y
`engine/catalogueSchema.ts` son los esquemas Zod de validación de contenido. El propio
`app/composables/useGameContent.ts` documenta en un comentario que "la validación de esquema es
exclusiva de build/CI" — es decir, la exclusión del runtime es **deliberada**, no un descuido.
Pero eso significa que hoy ningún proceso de `npm run typecheck` comprueba los tipos de esos dos
ficheros; su corrección de tipos depende por completo de que `npx vitest run` los ejercite bien
(y de que Zod, en tiempo de ejecución, atrape lo que TypeScript no comprobó en tiempo de
compilación ahí).

Los 17 tests de `engine/__tests__/` y los 7 specs de `e2e/` tampoco pasan nunca por
`npm run typecheck`: Vitest y Playwright ejecutan esos ficheros a través de esbuild/SWC, que
transpila sin comprobar tipos (la misma mecánica que este plan documenta en su `<objective>`
para `nuxt build`). Ningún error de tipos en un test se detectaría hasta que el test fallara en
tiempo de ejecución por otra razón, si es que llega a fallar.

Esto **no es un error del primer barrido** y no cambia el recuento de la §2 (sigue siendo 0),
pero es información real que la Task 3 necesita para decidir si el alcance actual —cubrir
`app/` y el subconjunto de `engine/` que `app/` importa— es aceptable o si conviene ampliar
`include` en un `tsconfig.json` propio de la raíz (mecanismo ya previsto por el propio plan para
la `opcion-b`).

## 6. Recomendación razonada del ejecutor para la Task 3

Dado que el recuento es 0, la Task 3 se resuelve en un segundo tal como el propio plan anticipa
("Si el inventario dio 0 errores, dilo y propón la opción A sin más discusión"). Se recomienda
**`opcion-a`** ("arreglar todo ahora y que el typecheck cubra el proyecto entero"): no hay nada
que arreglar, así que el coste de esta opción es cero en la práctica, y deja la puerta abierta a
ampliar la cobertura (§5) en un plan futuro sin que eso quede enmascarado como una excepción
permanente de `opcion-b`.

**Estimación de esfuerzo por opción**, a la vista de que el recuento real es 0:
- `opcion-a`: esfuerzo nulo — no hay errores que corregir.
- `opcion-b`: esfuerzo nulo para producir un `tsconfig.json` en verde, pero introduciría
  exclusiones que hoy no hacen falta (no hay nada que excluir para llegar a verde); solo
  tendría sentido si el usuario quisiera usarla para *ampliar* el alcance a `engine/schema.ts` /
  `engine/catalogueSchema.ts` de una vez.
- `opcion-c`: no aplica — no hay DEFECTOS REALES LATENTES que corregir ni ruido que suprimir.

## Cierre (añadido por la Task 4)

_Pendiente — se completa cuando se ejecute la Task 4 de este plan._
