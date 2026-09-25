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

## Relacionado

- `experto-etapas-de-villano-rhino-ultron-por-verificar.md`: la vida inicial en Experto sale de
  la etapa II (Rhino 15, Klaw 18 y Ultron 22 por jugador; Kang con su set `exp_kang`).

## Solución

Por decidir. Probablemente sea una fase propia (catálogo de módulos + UI + persistencia de la
selección en `SessionContext` + pasos con variantes), no una tarea rápida.
