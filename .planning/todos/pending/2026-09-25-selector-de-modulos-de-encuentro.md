---
id: selector-de-modulos-de-encuentro
created: 2026-09-25
source: conversación con el usuario (idea de producto)
severity: feature
area: preparación de partida
status: pending
files:
  - app/components/MiniSetupScreen.vue
  - app/pages/[game]/index.vue
  - content/marvel-characters.json
  - scripts/catalogue/fetch-marvelcdb.mjs
  - content/marvel-champions.json
---

# Idea: selector de módulos de encuentro tras elegir villano y dificultad

## Motivación

El grupo ya juega más partidas y con más variedad. El usuario guarda por separado el set
estándar, el set Experto y muchos módulos de encuentro, así que le vendría bien que la app le
dijera exactamente qué sacar de la caja.

## Qué quiere el usuario

Una pantalla (o sección) **«Módulos»** que aparezca después de elegir villano y dificultad:

1. **Sets base:** «Normal» y, solo si la dificultad es Experto, también «Experto».
2. **Módulos adicionales**, debajo:
   - El módulo que recomienda el villano sale **primero** y con la etiqueta **«Recomendado»**,
     marcado por defecto. Ejemplos: Rhino → Amenaza de Bomba (Bomb Scare), Klaw → Señores del
     Mal (Masters of Evil).
   - Se puede desmarcar el recomendado y marcar otro u otros (varios a la vez).
   - Cada módulo muestra su **número de dificultad** cuando el juego lo define (p. ej. el pack de
     Kang: Temporal 4, Amo del tiempo 6, Anacronautas 8). Si no se conoce, no se muestra nada:
     nunca un valor inventado.
3. Es de esperar que después los pasos de preparación (montar el mazo de encuentros) nombren
   los módulos elegidos en vez de un «añadid el módulo recomendado» genérico.

## Datos: qué hay y qué no

- La API pública de MarvelCDB da los card sets (módulos incluidos) y la vida por etapa.
- **No** da qué módulo recomienda cada villano, ni la dificultad de los módulos, ni qué etapas
  se usan en Experto. Todo eso hay que mantenerlo a mano en el catálogo, contrastado con las
  hojas de escenario o los reglamentos (restricción de fidelidad de reglas de `CLAUDE.md`).
- Klaw aún no está en el catálogo; añadirlo va aparte o dentro de este trabajo.

## Actualización 2026-09-25 (bis): los datos SÍ están en MarvelCDB, en la cara 1A del plan principal

La cara 1A del plan principal de cada escenario (la «hoja de escenario») viene en la API de
MarvelCDB (`/api/public/card/<código>a`, `type_code: main_scheme`), en inglés, y su `text` trae:
- Las etapas de Experto: «Rhino (I) and Rhino (II). (Rhino (II) and Rhino (III) instead for expert
  mode.)», con el mismo patrón en Klaw (01116a) y Ultron (01137a).
- El módulo recomendado: «One modular encounter set (recommended: Bomb Scare)». Klaw → Masters of
  Evil, Ultron → Under Attack. Kang (11007a) trae el módulo fijo «(Temporal)» y no tiene línea de
  Experto, porque va con su propio set `exp_kang`.
- Rhino 01097a, Klaw 01116a, Ultron 01137a, Kang 11007a.
Con esto, `scripts/catalogue/fetch-marvelcdb.mjs` puede sacar la etapa inicial en Experto y el
módulo recomendado de esa carta, en vez de mantenerlos a mano. Hay dos opciones: parsear el texto,
o anotarlo a mano y que el script compruebe que coincide con la carta. Mejor la segunda, porque
el texto libre es frágil. La dificultad numérica de los módulos (Kang: Temporal 4, etc.) NO
aparece en estas cartas; sigue siendo dato a mano.

## Relacionado

- `experto-etapas-de-villano-rhino-ultron-por-verificar.md`: la vida inicial en Experto sale de
  la etapa II (Rhino 15, Klaw 18 y Ultron 22 por jugador; Kang con su set `exp_kang`).

## Solución

Por decidir. Probablemente sea una fase propia (catálogo de módulos + UI + persistencia de la
selección en `SessionContext` + pasos con variantes), no una tarea rápida.
