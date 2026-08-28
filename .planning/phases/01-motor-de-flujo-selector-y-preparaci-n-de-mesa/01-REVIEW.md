---
phase: 01-motor-de-flujo-selector-y-preparacion-de-mesa
reviewed: 2026-08-28T21:50:57Z
depth: standard
files_reviewed: 41
files_reviewed_list:
  - .github/workflows/ci.yml
  - .gitignore
  - README.md
  - app/app.vue
  - app/assets/css/main.css
  - app/components/AppHeader.vue
  - app/components/ConfirmDialog.vue
  - app/components/ContentChangedNotice.vue
  - app/components/GameSelectorScreen.vue
  - app/components/IndexOverlay.vue
  - app/components/MesaListaScreen.vue
  - app/components/MiniSetupScreen.vue
  - app/components/NavBand.vue
  - app/components/ResumePrompt.vue
  - app/components/StepScreen.vue
  - app/composables/useGameContent.ts
  - app/composables/useGameSession.ts
  - app/composables/usePersistedSession.ts
  - app/pages/[game]/index.vue
  - app/pages/index.vue
  - content/games-index.ts
  - content/marvel-champions.json
  - engine/__tests__/content.test.ts
  - engine/__tests__/fixtures/tiny-game.json
  - engine/__tests__/navigator.test.ts
  - engine/__tests__/persistence.test.ts
  - engine/__tests__/resolve.test.ts
  - engine/__tests__/schema.test.ts
  - engine/__tests__/toc.test.ts
  - engine/expand.ts
  - engine/flatten.ts
  - engine/navigator.ts
  - engine/persistence.ts
  - engine/resolve.ts
  - engine/schema.ts
  - engine/toc.ts
  - engine/types.ts
  - netlify.toml
  - nuxt.config.ts
  - package.json
  - public/robots.txt
  - tsconfig.json
  - vitest.config.ts
findings:
  critical: 1
  warning: 6
  info: 2
  total: 9
status: issues_found
---

# Fase 01: Informe de revisión de código

**Revisado:** 2026-08-28T21:50:57Z
**Profundidad:** standard
**Ficheros revisados:** 41
**Estado:** issues_found

## Resumen

Se ha revisado el motor de flujo puro (`engine/`), la capa reactiva (`app/composables/`), los componentes Vue, el contenido de Marvel Champions y la configuración de build/CI/despliegue. La suite de Vitest (56 tests, 6 ficheros) pasa en verde y la separación motor/Vue/Zod declarada en CLAUDE.md se respeta en general (ningún componente importa `~~/engine` directamente, `zod` solo se importa en `engine/schema.ts`, `localStorage` solo se toca en `usePersistedSession.ts`, no hay `v-html` en ningún componente).

Sin embargo, se ha encontrado un fallo de bloqueo real y reproducible por lectura de código: `usePersistedSession.load()` valida la forma de los datos persistidos de forma insuficiente (solo comprueba que exista la clave `formatVersion`), lo que permite que un objeto parcial en `localStorage` llegue a `resume()`/`contentChangedFallback()` con `context` indefinido y provoque una excepción no controlada en el primer render de la pantalla "El contenido ha cambiado". Además se han encontrado varias inconsistencias latentes entre lo que valida Zod (solo en CI/tests) y lo que se ejecuta realmente en el navegador (JSON crudo, sin paso por Zod), un test que es más estricto de lo que su propio nombre promete, un target táctil por debajo del mínimo de 48px documentado, y algunos huecos menores de calidad/accesibilidad.

## Critical Issues

### CR-01: Datos persistidos parcialmente corruptos hacen crashear la app en el flujo "contenido cambiado"

**Archivo:** `app/composables/usePersistedSession.ts:22-37` (causa raíz) → se propaga por `engine/persistence.ts:46-48,57-63` → explota en `app/composables/useGameSession.ts:69-73`

**Problema:**
`usePersistedSession.load()` solo comprueba que el objeto parseado tenga la clave `formatVersion`:

```ts
const parsed = JSON.parse(raw)
if (parsed && typeof parsed === 'object' && 'formatVersion' in parsed) {
  return parsed as PersistedPosition
}
```

No valida que existan `contentVersion`, `runtimeId`, `round` ni, sobre todo, `context`. Un valor en `localStorage` como `{"formatVersion":1}` (residuo de una build anterior con otra forma de dato, edición manual, o escritura parcial) pasa esta comprobación y se castea con `as PersistedPosition` sin ninguna verificación real de tipos.

Ese objeto llega a `resume()` en `engine/persistence.ts`. Como `persisted.contentVersion` es `undefined`, la comparación `persisted.contentVersion !== fresh.contentVersion` es `true`, así que se entra en `contentChangedFallback`:

```ts
function contentChangedFallback(persisted: PersistedPosition, fresh: EngineSession): EngineSession {
  return { ...fresh, cursor: 0, round: 1, context: persisted.context }
}
```

`persisted.context` es `undefined`, así que `session.context` queda `undefined`. En `app/pages/[game]/index.vue` esto se asigna a `session.value` y se muestra `ContentChangedNotice`, cuyo prop `session-context` está ligado a la computed `sessionContextLabel` de `useGameSession.ts`:

```ts
const sessionContextLabel = computed<string>(() => {
  if (!session.value) return ''
  const { playerCount, difficulty } = session.value.context   // session.value.context === undefined
  return `${playerCount} jug · ${difficulty === 'expert' ? 'Experto' : 'Normal'}`
})
```

Desestructurar `undefined` lanza `TypeError: Cannot destructure property 'playerCount' of ... as it is undefined`, sin ningún `try/catch` ni error boundary alrededor — la app entera queda en blanco justo en el momento en que el usuario más necesita que el asistente "nunca falle". El propio comentario de `usePersistedSession.ts` promete que "cualquier fallo de parseo... se trata como ausencia de dato, nunca como error", pero esa garantía solo cubre el `JSON.parse` fallido, no la forma incompleta del objeto ya parseado.

**Cómo se puede producir en la práctica:** cualquier clave `tga:progress:marvel-champions` remanente de una iteración anterior del formato (el proyecto está en desarrollo activo), una edición manual en DevTools, o una futura migración de formato que no limpie claves antiguas.

**Arreglo:**
```ts
// usePersistedSession.ts
function isPersistedPosition(value: unknown): value is PersistedPosition {
  return !!value && typeof value === 'object'
    && 'formatVersion' in value
    && 'contentVersion' in value
    && 'runtimeId' in value
    && 'round' in value
    && 'context' in value
    && typeof (value as any).context === 'object' && (value as any).context !== null
}

function load(gameId: string): PersistedPosition | null {
  const raw = useLocalStorage<string>(storageKey(gameId), '', { writeDefaults: false }).value
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return isPersistedPosition(parsed) ? parsed : null
  }
  catch {
    return null
  }
}
```
Alternativamente (o además), `contentChangedFallback` en `engine/persistence.ts` puede defenderse a sí mismo validando que `persisted.context` sea un objeto antes de reutilizarlo, cayendo a un contexto neutro si no lo es — el motor es la última línea de defensa y hoy asume ciegamente que su entrada tiene la forma correcta.

## Warnings

### WR-01: El valor por defecto de `kind` solo existe en Zod (build/CI), nunca en el bundle del navegador — la contadora de posición se rompe silenciosamente si un futuro paso omite `kind`

**Archivo:** `app/composables/useGameSession.ts:58-67` (en concreto la línea 62); esquema relevante en `engine/schema.ts:27`

**Problema:** `engine/schema.ts` declara `kind: z.enum(['step', 'summary']).default('step')`, e implica que un paso puede omitir `kind` y se le asignará `'step'` — pero ese `.default()` solo se ejecuta dentro de `validateGameDefinition()`, que **solo se llama desde los tests de Vitest** (`engine/__tests__/content.test.ts`). El contenido que de verdad llega al navegador se importa como JSON crudo en `app/composables/useGameContent.ts` (`marvelChampions as GameDefinition`), **sin pasar nunca por Zod**. Si un paso futuro omite `kind` confiando en el default documentado, el test de contenido pasará (usa el objeto ya validado por Zod), pero en producción `step.kind` será `undefined`.

La computed `position` en `useGameSession.ts` filtra con comparación estricta, sin el fallback que sí usan otras dos partes del código (`app/pages/[game]/index.vue:123` y `engine/__tests__/content.test.ts:40`, ambas con `(step.kind ?? 'step') === 'step'`):
```ts
const stepNodes = session.value.sequence.filter(node => node.step.kind === 'step')
```
Un paso con `kind` omitido queda fuera de `stepNodes`, así que el contador "X de N" del `AppHeader` se desincroniza (o desaparece del todo si el paso actual es justo ese) exactamente para el contenido que el propio esquema invita a autorar.

**No se dispara con el contenido actual** (todos los pasos de `content/marvel-champions.json` declaran `"kind": "step"` explícitamente), pero es una trampa para la próxima vez que se añada contenido.

**Arreglo:** unificar el criterio en los tres sitios — o bien exigir `kind` explícito en el esquema (quitar `.default()`), o bien aplicar el mismo fallback `(node.step.kind ?? 'step')` en `useGameSession.ts:62` y en cualquier otro sitio que compare `kind` contra `'step'`.

### WR-02: El test de citas es más estricto que su propio nombre y que el esquema — falso negativo garantizado en cuanto se cite "learn-to-play"

**Archivo:** `engine/__tests__/content.test.ts:44-53`

**Problema:** el test se titula *"cada paso con kind step lleva citation con source rules-reference **o learn-to-play**..."*, y el esquema (`engine/schema.ts:13`) permite ambos valores del enum `source`. Pero la aserción solo acepta uno:
```ts
expect(step.citation!.source).toBe('rules-reference')
```
En cuanto un futuro paso cite legítimamente la guía "learn-to-play" (una fuente válida según el propio esquema y según el propio título del test), este test fallará en CI aunque el contenido sea correcto — un gate que muerde donde no debe, contradiciendo su propósito documentado.

**Arreglo:**
```ts
expect(['rules-reference', 'learn-to-play']).toContain(step.citation!.source)
```

### WR-03: `checklist` en la pantalla "mesa lista" recorre TODAS las secciones del juego, no solo la sección donde aparece el resumen — bomba de relojería para la Fase 2

**Archivo:** `app/pages/[game]/index.vue:119-127`

**Problema:**
```ts
const checklist = computed<string[]>(() => {
  if (!game) return []
  return game.sections.flatMap(section =>
    section.phases
      .filter(phase => phase.steps.some(step => (step.kind ?? 'step') === 'step'))
      .map(phase => phase.summaryLabel)
      .filter((label): label is string => Boolean(label)),
  )
})
```
Esta computed no depende de `session`/`cursor` en absoluto: recorre `game.sections` completo. Con el contenido actual (una sola sección `setup`) el resultado es correcto por casualidad. Pero en cuanto la Fase 2 añada la sección `round` (con sus propias fases y `summaryLabel`), la pantalla "mesa lista" — que se muestra al terminar la preparación, antes de que exista ninguna ronda jugada — empezará a listar también los resúmenes de fases de ronda, aunque el jugador ni siquiera haya empezado a jugar. Nada en el propio comentario del código ("D-03: la lista de repaso se deriva de los summaryLabel de las fases con al menos un paso kind:step") acota esto a la sección en curso.

**Arreglo:** derivar la lista solo de las fases pertenecientes a `currentNode.value.sectionId` (o, más robusto, de los nodos de `session.value.sequence` anteriores al nodo `summary` actual), no de `game.sections` completo.

### WR-04: Ninguna fila del `IndexOverlay` alcanza el mínimo de 48px de target táctil

**Archivo:** `app/components/IndexOverlay.vue:86`

**Problema:** las filas pulsables del índice de salto usan `min-h-11`:
```html
<button ... class="w-full min-h-11 flex items-center gap-md px-sm text-left ...">
```
`main.css` no redefine la escala numérica por defecto de Tailwind (solo añade tokens nombrados `xs..3xl`), así que `h-11`/`min-h-11` sigue resolviendo al valor por defecto: `11 × 0.25rem = 44px`, por debajo del mínimo de 48px que el propio proyecto exige para objetivos táctiles en tablet. El resto de controles interactivos del proyecto (botones de `NavBand`, `ConfirmDialog`, `ResumePrompt`, `MiniSetupScreen`, `AppHeader`, etc.) sí cumplen 48px o más; esta es la única excepción encontrada, precisamente en el control que se usa para saltar entre pasos con la partida en marcha.

**Arreglo:**
```html
<button ... class="w-full min-h-12 flex items-center gap-md px-sm text-left ...">
```

### WR-05: Falta `lang="es"` (y título de página) en la configuración de la app

**Archivo:** `nuxt.config.ts:30-39`

**Problema:** `app.head` solo declara el meta `viewport`; no hay `htmlAttrs: { lang: 'es' }` ni `title`. Para una aplicación cuyo único idioma es el español (y que además locuta por voz en fases posteriores), la ausencia de `lang="es"` en el `<html>` es un defecto de accesibilidad real (lectores de pantalla y traductores automáticos del navegador no tienen forma de saber el idioma del documento) y no tiene ningún coste evitarlo.

**Arreglo:**
```ts
app: {
  head: {
    htmlAttrs: { lang: 'es' },
    title: 'TableGameAssistant',
    meta: [
      { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
    ],
  },
},
```

### WR-06: `MiniSetupScreen` hardcodea el rango de jugadores `[1,2,3,4]` en un componente que se presenta como reutilizable entre juegos

**Archivo:** `app/components/MiniSetupScreen.vue:54`

**Problema:**
```html
<button v-for="n in [1, 2, 3, 4]" :key="n" ... @click="emit('update:playerCount', n)">
```
El propio comentario de cabecera del componente lo describe como "componente tonto" reutilizable (no menciona ningún juego concreto), en línea con la invariante "añadir un juego debe significar añadir un fichero de contenido". Sin embargo, el rango de jugadores está tecleado directamente en la plantilla en vez de derivarse de metadatos del juego (p. ej. `minPlayers`/`maxPlayers` en `GameDefinition`). Marvel Champions admite 1-4, pero Warhammer 40.000 (el segundo juego ya anunciado en `content/games-index.ts`) tiene un rango de jugadores distinto — este componente necesitará tocarse de nuevo pese al objetivo declarado de extensibilidad por contenido.

**Arreglo:** añadir `minPlayers`/`maxPlayers` (o una lista explícita de recuentos válidos) a `GameDefinition`/`GameDefinitionSchema`, y generar el rango de botones a partir de esos valores en vez de la lista fija `[1,2,3,4]`.

## Info

### IN-01: Import `flatten` sin usar en `content.test.ts`

**Archivo:** `engine/__tests__/content.test.ts:5`
**Problema:** `import { flatten } from '../flatten'` no se usa en ningún momento del fichero (se usa `expand`, no `flatten`).
**Arreglo:** eliminar el import.

### IN-02: Comentario de `engine/toc.ts` nombra "Marvel Champions" dentro del propio motor puro

**Archivo:** `engine/toc.ts:7`
**Problema:** el comentario dice "cero conocimiento de los bloques de Marvel Champions (TECH-04)" — es solo un comentario explicativo, no lógica acoplada al juego, pero nombra literalmente el juego dentro de `engine/`, que la propia invariante del proyecto pide mantener libre de terminología específica de un juego concreto (incluso en comentarios, para que copiar/pegar este fichero como plantilla de un juego nuevo no arrastre referencias ajenas).
**Arreglo:** reformular como "...de los bloques de un juego concreto (TECH-04)" sin nombrar Marvel Champions.

---

_Reviewed: 2026-08-28T21:50:57Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
