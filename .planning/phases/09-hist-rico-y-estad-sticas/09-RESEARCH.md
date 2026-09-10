# Phase 9: Histórico y estadísticas - Research

**Researched:** 2026-09-10
**Domain:** Registro de resultado de partida, persistencia en localStorage, agregación estadística pura, dos pantallas Nuxt nuevas — todo offline, cero Firestore
**Confidence:** HIGH

## Summary

Esta fase no introduce ninguna tecnología nueva: es composición sobre patrones que las
Fases 1, 6 y 7 ya establecieron y verificaron. El trabajo se reduce a (1) una función pura
nueva en `engine/` (`buildHistoryEntry` + formateadores de fecha/duración, más
`aggregateStatistics`), calcada de `engine/counters.ts`/`engine/header.ts` en estilo y
disciplina de tests; (2) una extensión de la única costura de `localStorage`
(`app/composables/usePersistedSession.ts`) con una clave nueva (`tga:history`) que convive
con `VOICE_KEY` sin tocarse entre sí — el mismo patrón de aislamiento que ya demostró
sobrevivir a `clear(gameId)`; y (3) dos páginas Nuxt nuevas (`/historico`, `/estadisticas`)
que se registran en `nitro.prerender.routes` porque `crawlLinks: false` no las descubre
solas.

`09-CONTEXT.md` y `09-UI-SPEC.md` ya cierran 26 decisiones y todo el contrato visual — este
documento no reabre ninguna, solo ancla cada decisión a los ficheros de código reales que
el planner va a tocar, con nombres de función y líneas concretas. La pieza más delicada no
es técnica sino de orden de ejecución: `onEndGameConfirm` (`app/pages/[game]/index.vue`)
destruye exactamente los datos que la entrada del histórico necesita (`session.value = null`
seguido de `clear(gameId)`), así que el diálogo de resultado (D-01) debe insertarse
**antes** de esas dos líneas, leyendo `session.value.context` mientras todavía existe.

**Primary recommendation:** Construir en el orden que `ARCHITECTURE.md` §Chunk 5 ya fijó —
funciones puras del motor primero (testeadas contra una sesión de mentira, sin UI), después
la extensión de `usePersistedSession.ts`, después el cableado del diálogo en `index.vue`, y
solo al final las dos pantallas nuevas. Cero dependencias nuevas de npm.

## User Constraints (from CONTEXT.md)

### Locked Decisions

Las 26 decisiones D-01..D-26 de `09-CONTEXT.md` están LOCKED. Resumen operativo (el
documento completo, con las maquetas ASCII y las citas del Rules Reference, es la fuente
de verdad — no se resume aquí lo que ya está escrito con precisión):

- **D-01/D-02/D-03/D-04/D-05** — Un solo diálogo de 4 botones (`GameOutcomeDialog`)
  sustituye al `ConfirmDialog` actual de «Partida terminada»; se apila igual; tras
  registrar, aviso breve «Partida registrada» (o de fallo, D-03) porque `writeRaw()` falla
  en silencio por diseño; el mismo diálogo aparece siempre, incluso en setup; la ruta de
  descarte (`onDiscardConfirm`) NO registra nada y no se toca.
- **D-06** — Enum guardado `'mainSchemeCompleted' | 'heroesEliminated'`; etiquetas en
  español «Se completó el Plan Principal» / «Todos los héroes eliminados» — contrastado
  contra Rules Reference v1.7 p. 46 y «Eliminated» durante la discusión.
- **D-07/D-08/D-09/D-10** — `startedAt` se fija UNA VEZ en `start()`
  (`useGameSession.ts`), campo aditivo de `SessionContext`, nunca reescrito al reanudar.
  Duración = `Date.now() - startedAt`, reloj de pared sin tope. Rondas = `round` tal cual
  («hasta la ronda N»), nunca `round - 1`. Sesión de v1.7 sin `startedAt` → `durationMs:
  null` → «—» en pantalla, nunca 0, nunca relleno.
- **D-11/D-12/D-13/D-14/D-15** — Cada entrada guarda id + nombre congelado (alias español)
  de villano y héroes; una entrada sin selección se registra igual, fuera del % con línea
  de muestra declarada; clave `tga:history` con envoltorio `{ formatVersion: 1, entries:
  [] }`, lectura defensiva entrada a entrada; `syncedToFirestore` NO se escribe en esta
  fase; cada entrada lleva `gameId`, un solo histórico para toda la app.
- **D-16/D-17/D-18** — Dos rutas separadas `/historico` y `/estadisticas`, accesos como dos
  botones secundarios bajo las tarjetas de juego del inicio, enlace cruzado entre las dos
  pantallas (navegación completa, NO drill-down filtrado).
- **D-19/D-20/D-21/D-22** — Tarjeta con todo visible (sin modal de detalle); borrado con
  `ConfirmDialog` existente + `destructive: true`; fecha/duración formateadas por función
  pura del motor (nunca `toLocaleDateString`); estado vacío con mensaje + explicación de
  cómo se rellena.
- **D-23/D-24/D-25/D-26** — Solo héroes/villanos jugados al menos una vez; orden % desc →
  partidas jugadas desc → alfabético; sin umbral mínimo (recuento y % con mismo peso
  visual); atribución cooperativa: resultado a TODOS los héroes de la partida, una vez por
  héroe distinto (no por hueco).

### Claude's Discretion

- Nombres de ficheros/rutas/símbolos (`engine/history.ts`, `engine/statistics.ts`,
  `app/pages/historico.vue`, `app/pages/estadisticas.vue`, `GameOutcomeDialog.vue`).
- Redacción exacta de botones/rótulos (ya cerrada por `09-UI-SPEC.md` — ver Copywriting
  Contract ahí).
- Estado vacío de estadísticas (ya cerrado por `09-UI-SPEC.md` §7).
- Generación del `id` de entrada — timestamp + sufijo aleatorio basta, no hace falta
  `crypto.randomUUID`.
- Tope de entradas guardadas — no hay requisito; si se pone, debe justificarse por escrito.
- Si el histórico se valida con Zod en un test de CI (Zod nunca cruza a `app/`).
- Si la entrada guarda contadores finales de vida — recomendación: no.
- Forma concreta del aviso de D-03 (ya cerrada por `09-UI-SPEC.md` §8).
- Supresión de atajos de teclado con el diálogo abierto — heredada, no nueva (verificar,
  no rediseñar).

### Deferred Ideas (OUT OF SCOPE)

- **STAT-06** (% de victorias por jugador, rachas) — el dato (`playerName`) estará
  guardado desde el primer día; ninguna pantalla de esta fase lo agrega.
- **STAT-07** (desglose por dificultad) — la entrada guarda `difficulty`; ninguna pantalla
  lo cruza.
- **HIST-10** (editar una entrada) — solo borrar en esta fase.
- Un tercer resultado «no terminada»/«abandonada» — descartado, no diferido: «Salir sin
  registrar» cubre ese caso.
- Registrar la partida descartada desde «Empezar partida nueva» — sin requisito.
- Total general de victorias, gráficas, exportar, filtros por fecha — sin requisito en
  ningún hito.
- Tope de duración de cordura — anotado como arreglo futuro si aparece un caso patológico.
- El recuento «37 clips» erróneo (real: 35) — pendiente desde Fase 6, fuera de esta fase.
- `cr-03-experto-sustitucion-cartas-rhino-ultron` (todo pendiente) — revisado y no plegado
  a esta fase.
- Contador de amenaza, fichas de estado, editor de catálogo — exclusiones permanentes de
  `PROJECT.md`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HIST-01 | «Partida terminada» ofrece registrar el resultado | `GameOutcomeDialog` sustituye al `ConfirmDialog` en `onEndGameRequest`/`awaitingEndConfirm`, ver Integration Points |
| HIST-02 | Resultados Ganada/Perdida + salida sin registrar | Enum de 3 valores más `dismiss`, ver Código/Anti-Patterns |
| HIST-03 | Causa de derrota (plan principal / héroes eliminados) | Enum `'mainSchemeCompleted' \| 'heroesEliminated'`, contrastado con RR v17 p.46, D-06 |
| HIST-04 | Registro guarda resultado, causa, villano, héroe+nombre por jugador, fecha, dificultad, nº jugadores, duración, rondas | `buildHistoryEntry()`, ver Architecture Patterns §Pattern 1 |
| HIST-05 | Motor expone inicio de partida y ronda actual | `SessionContext.startedAt` (D-07) + `session.round` ya existente |
| HIST-06 | Histórico vive en localStorage, fuente de verdad | Extensión de `usePersistedSession.ts`, clave `tga:history` |
| HIST-07 | Pantalla lista partidas, más reciente primero | `/historico`, orden por `id`/timestamp descendente |
| HIST-08 | Borrar una entrada con confirmación | Reutiliza `ConfirmDialog.vue` existente, `destructive: true` |
| HIST-09 | «Partida terminada» borra sesión pero nunca histórico | Precedente exacto: `VOICE_KEY` sobrevive a `clear(gameId)` |
| STAT-01 | Pantalla de estadísticas accesible desde el inicio | Botón en `GameSelectorScreen.vue`, `navigateTo('/estadisticas')` |
| STAT-02 | % de victorias por héroe | `aggregateStatistics()`, agrupación por `heroId` |
| STAT-03 | % de victorias por villano | `aggregateStatistics()`, agrupación por `villainId` |
| STAT-04 | Pantalla lee solo localStorage, nunca Firestore | Firestore no existe en el código de esta fase (D-14); `loadHistory()` es la única fuente |
| STAT-05 | Estado vacío claro, sin error ni % engañoso | Nunca renderizar tabla con 0 filas; empty-state dedicado, ver `09-UI-SPEC.md` §7 |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Captura del resultado de fin de partida | Browser/Client (componente Vue `GameOutcomeDialog`) | — | Interacción táctil pura, sin lógica de negocio propia; emite el enum ya resuelto |
| Construcción de la entrada de histórico | Engine puro (`engine/history.ts`) | Frontend Server (ninguno — SSG, no hay servidor en runtime) | Lógica de negocio determinista (fecha/duración/atribución), testeable sin DOM, sin efectos secundarios |
| Persistencia del histórico | Browser/Client (`usePersistedSession.ts` → `window.localStorage`) | — | Única costura de storage de la app; no hay backend en esta fase |
| Agregación de estadísticas | Engine puro (`engine/statistics.ts`) | Browser/Client (composable que lo invoca) | Cálculo puro sobre un array ya en memoria — no hay base de datos ni consulta |
| Renderizado de las dos pantallas nuevas | Browser/Client (páginas Nuxt) + CDN/Static (HTML prerenderizado) | — | `nuxt generate` prerrenderiza `/historico` y `/estadisticas`; el contenido dinámico (entradas) se resuelve en cliente contra localStorage tras la hidratación |
| Persistencia de Firestore | — (no existe en esta fase) | — | Explícitamente diferido a Fase 10 (D-14); cualquier código que la mencione está fuera de alcance |

## Standard Stack

### Core

Ninguna librería nueva. Esta fase es 100% composición sobre el stack ya instalado y
verificado en Fases 1-8.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 (Composition API, `<script setup>`) | 3.5.41 (ya en `package.json`) | Componentes de las dos pantallas nuevas y `GameOutcomeDialog` | Ya en uso en toda la app; ningún patrón nuevo lo requiere |
| Nuxt 4 (`nuxt generate`) | 4.5.2 (ya en `package.json`) | Páginas de fichero (`app/pages/historico.vue`, `app/pages/estadisticas.vue`) + `nitro.prerender.routes` | Ya en uso; las dos rutas nuevas siguen el patrón exacto de `/marvel-champions` |
| Tailwind CSS v4 (`@tailwindcss/vite`) | 4.3.3 (ya en `package.json`) | Estilos de las dos pantallas y componentes nuevos | Cero tokens nuevos por contrato de `09-UI-SPEC.md` — reutiliza la escala existente |

**Version verification:** No se instala ningún paquete nuevo para esta fase, así que no
aplica una comprobación de versión de registro — se confirma que las versiones ya
instaladas (`package.json`, leído directamente) son las que la app usa en producción hoy.
`npm view zod version` → **4.6.1** disponible en el registro (proyecto fijado en `^4.4.3`,
sin necesidad de actualizar para esta fase); `npm view vitest version` → **5.0.0**
disponible (proyecto fijado en `^4.1.11`, ídem). Ninguna actualización de estas
dependencias es necesaria ni recomendada dentro del alcance de esta fase — son
observaciones de researcher, no una acción para el planner. [VERIFIED: npm registry]

### Supporting

Ninguna. `@vueuse/core`/`@vueuse/nuxt` ya están instaladas pero **no aportan nada nuevo a
esta fase**: `useLocalStorage` de VueUse fue explícitamente descartado por el propio
proyecto para la costura de storage (comentario de cabecera de
`usePersistedSession.ts`, motivo WR-02: evitar watchers/listeners que no se desechan fuera
de un `setup()` síncrono) — la extensión de esta fase debe seguir el mismo patrón de
lectura/escritura imperativa directa sobre `window.localStorage`, no introducir
`useLocalStorage` como atajo para el histórico.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Date.now()` + sufijo aleatorio para el id de entrada (Claude's Discretion) | `crypto.randomUUID()` | Exige contexto seguro (HTTPS) — la app ya se sirve por HTTPS en Vercel, así que funcionaría, pero el proyecto no usa `randomUUID` en ningún otro sitio del código de producción (solo en un mock de test) y no hay necesidad de unicidad criptográfica para una clave de array local — un timestamp + `Math.random().toString(36)` es collision-safe para el volumen real (decenas de partidas) y consistente con el estilo ya usado (`Math.random()` aparece en un test mock existente) |
| Extender `usePersistedSession.ts` (recomendado, D-13/ARCHITECTURE.md) | Un segundo fichero de storage dedicado a histórico | Rompería la afirmación literal de "única costura de localStorage" que el propio fichero y `CLAUDE.md` declaran; el precedente de `VOICE_KEY` conviviendo con `KEY_PREFIX + gameId` en el mismo fichero ya demuestra que múltiples claves independientes conviven sin fricción |
| Validar el histórico con Zod en un test de Vitest (Claude's Discretion, recomendado) | No validar en absoluto | Zod ya es la herramienta de "fail loudly at build" del proyecto (`CLAUDE.md`); un test que construye una entrada a mano y la valida contra un `GameHistoryEntrySchema` cuesta poco y documenta la forma exacta del dato — pero el propio `engine/types.ts` NO debe importar zod (mismo motivo que `CatalogueHero`/`CatalogueVillain`, DC-03 de Fase 5): el tipo TS vive sin zod, el esquema de test vive aparte |

## Package Legitimacy Audit

**No aplica esta fase.** Ningún paquete npm nuevo se instala — toda la funcionalidad se
construye sobre dependencias ya presentes en `package.json` (Vue, Nuxt, Tailwind, Zod,
Vitest, VueUse). El gate de legitimidad de paquetes (`slopcheck`, verificación de
registro) queda documentado aquí como explícitamente no ejecutado porque no hay superficie
de instalación que auditar.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  app/pages/[game]/index.vue                                      │
│                                                                    │
│  IndexOverlay "Partida terminada" ──emit('end-game')──▶           │
│                                                                    │
│  onEndGameRequest() → awaitingEndConfirm = true                  │
│         │                                                          │
│         ▼                                                          │
│  GameOutcomeDialog  (D-01: 4 botones)                             │
│    ├─ GANADA ─────────────┐                                       │
│    ├─ PERDIDA·mainScheme ─┤─ record(outcome) ──┐                  │
│    ├─ PERDIDA·heroes ─────┘                    │                  │
│    └─ Salir sin registrar ── dismiss() ─┐       │                  │
│                                          │       ▼                  │
│                                          │  onOutcomeRecorded(outcome)
│                                          │       │                  │
│                                          │       ▼                  │
│                                          │  buildHistoryEntry(       │
│                                          │    session.context,       │
│                                          │    session.round,         │
│                                          │    outcome, catalogue)     │
│                                          │       │  [engine/history.ts, PURA]
│                                          │       ▼                  │
│                                          │  appendHistoryEntry(entry) │
│                                          │       │  [usePersistedSession.ts]
│                                          │       ▼                  │
│                                          │  window.localStorage      │
│                                          │  key: tga:history         │
│                                          │       │                  │
│                                          │  ok?/fail? → HistorySavedNotice
│                                          ▼       ▼                  │
│                              (ambos caminos convergen aquí)         │
│  silence() → session.value = null → clear(gameId) → navigateTo('/')│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐        ┌──────────────────────────────┐
│  app/pages/historico.vue │◀──────▶│  app/pages/estadisticas.vue    │
│                           │ cross- │                                │
│  loadHistory()            │ link   │  loadHistory()                 │
│    │ [usePersistedSession] │(D-18) │    │ [usePersistedSession]      │
│    ▼                      │        │    ▼                            │
│  entries[] ─▶ HistoryCard  │        │  aggregateStatistics(entries)   │
│  (más reciente primero)    │        │    │ [engine/statistics.ts, PURA]│
│                           │        │    ▼                            │
│  Borrar → ConfirmDialog    │        │  filas ordenadas → tabla        │
│  → removeHistoryEntry(id) │        │  (o empty-state si entries=[])  │
└─────────────────────────┘        └──────────────────────────────┘
                ▲                                  ▲
                │        (dos botones secundarios) │
                └──────── GameSelectorScreen.vue ───┘
                          (ruta '/')
```

### Recommended Project Structure

```
engine/
├── history.ts              # buildHistoryEntry, formatDate, formatDuration (D-21) — PURO
├── statistics.ts           # aggregateStatistics (D-23/D-24/D-25/D-26) — PURO
├── types.ts                 # (extendido) SessionContext.startedAt, GameHistoryEntry, LossCause
└── __tests__/
    ├── history.test.ts
    └── statistics.test.ts

app/
├── composables/
│   └── usePersistedSession.ts   # (extendido) HISTORY_KEY, loadHistory, appendHistoryEntry, removeHistoryEntry
├── components/
│   ├── GameOutcomeDialog.vue    # NUEVO — sustituye al ConfirmDialog de "Partida terminada"
│   ├── HistoryEntryCard.vue     # NUEVO (o v-for inline, ambos aceptables)
│   └── HistorySavedNotice.vue   # NUEVO — montado en app.vue junto a UpdateBanner
├── pages/
│   ├── historico.vue            # NUEVA ruta /historico
│   └── estadisticas.vue         # NUEVA ruta /estadisticas
└── app.vue                       # (extendido) añade <HistorySavedNotice /> junto a <UpdateBanner />

nuxt.config.ts                    # (extendido) nitro.prerender.routes += '/historico', '/estadisticas'
```

### Pattern 1: Función pura que construye la entrada de histórico

**What:** `buildHistoryEntry` toma la sesión (ya sobre destruirse), el catálogo y el
resultado elegido, y devuelve un objeto plano listo para persistir — sin tocar
`localStorage` ni Vue.
**When to use:** Se invoca una sola vez, en el manejador que reemplaza a
`onEndGameConfirm`'s primer tramo, ANTES de `session.value = null`.
**Example:**
```typescript
// engine/history.ts — calcado en disciplina de engine/counters.ts (D-11)
import { resolvePlayerSlots, resolveVillainId } from './selection'
import type { CharacterCatalogue, EngineSession, GameHistoryEntry, LossCause } from './types'

export type GameOutcome = 'won' | LossCause // LossCause = 'mainSchemeCompleted' | 'heroesEliminated'

export function buildHistoryEntry(
  session: EngineSession,
  catalogue: CharacterCatalogue | null,
  outcome: GameOutcome,
  now: number, // inyectado, no Date.now() interno — testeable determinista
): GameHistoryEntry {
  const { context, round, gameId } = session
  const villainId = resolveVillainId(context)
  const villain = catalogue?.villains.find(v => v.id === villainId) ?? null
  const slots = resolvePlayerSlots(context)

  const players = slots.map((slot) => {
    const hero = catalogue?.heroes.find(h => h.id === slot.heroId) ?? null
    return {
      heroId: slot.heroId,
      // D-11: nombre CONGELADO = alias español visto en pantalla, no el
      // nombre inglés del catálogo. resolveHeroSpanishName vive en
      // useHeroSearch.ts (app/), así que el llamador (composable, no este
      // fichero) debe resolverlo ANTES de invocar buildHistoryEntry, o
      // este fichero debe recibir ya el mapa heroId→spanishName resuelto.
      heroName: hero ? /* alias ya resuelto por el llamador */ hero.name : null,
      playerName: slot.playerName,
    }
  })

  return {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    gameId,
    result: outcome === 'won' ? 'won' : 'lost',
    lossCause: outcome === 'won' ? null : outcome,
    villainId,
    villainName: villain?.name ?? null,
    players,
    difficulty: context.difficulty,
    playerCount: context.playerCount,
    round, // D-09: tal cual, "hasta la ronda N"
    durationMs: context.startedAt != null ? now - context.startedAt : null, // D-10
    recordedAt: new Date(now).toISOString(),
  }
}
```
**Nota de implementación real:** el alias español se resuelve mejor en la capa que ya
importa `useHeroSearch.ts` (`app/composables`, no `engine/`), porque `engine/` no debe
importar `app/data/spanish-hero-aliases.ts` (rompería la frontera pura del motor). El
planner debe decidir si `buildHistoryEntry` recibe un mapa `heroId → spanishName` ya
resuelto como cuarto argumento, o si el nombre se resuelve en un paso posterior en el
composable que envuelve a esta función — cualquiera de las dos formas es aceptable, pero
la resolución NUNCA debe ocurrir dentro de `engine/`.

### Pattern 2: Formateadores puros de fecha y duración (D-21)

**What:** Dos funciones puras (`formatEntryDate`, `formatEntryDuration`) que nunca llaman
a `toLocaleDateString` — mismo motivo que llevó a D-21: los tests deben comparar cadenas
exactas sin depender del locale del runner de CI.
**When to use:** Consumidas por `HistoryEntryCard` (vía el composable, nunca importadas
directamente por el componente — TECH-04/patrón de "componentes tontos").
**Example:**
```typescript
// engine/history.ts — precedente exacto: engine/header.ts::describeHeader
const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function formatEntryDate(isoString: string): string {
  const d = new Date(isoString)
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`
}

export function formatEntryDuration(durationMs: number | null): string {
  if (durationMs === null) return '—' // D-10: nunca 0, nunca inventado
  const totalMinutes = Math.round(durationMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  return `${hours} h ${minutes} min`
}
```

### Pattern 3: Agregación de estadísticas con desempate en cascada (D-24/D-26)

**What:** `aggregateStatistics` recorre `entries[]` una vez, agrupa por `heroId`/`villainId`
distinto (no por hueco — D-26), y devuelve dos arrays ya ordenados.
**When to use:** Invocada por `/estadisticas` a través de un composable; el componente
nunca reordena ni recalcula.
**Example:**
```typescript
// engine/statistics.ts
export interface StatRow {
  id: string
  name: string
  wins: number
  played: number
  pct: number // 0-100, redondeado para mostrar
}

function buildRows(
  entries: GameHistoryEntry[],
  extractIds: (e: GameHistoryEntry) => { id: string, name: string }[],
): StatRow[] {
  const byId = new Map<string, { name: string, wins: number, played: number }>()
  for (const entry of entries) {
    const won = entry.result === 'won'
    const distinctIds = new Map(extractIds(entry).map(x => [x.id, x.name])) // D-26: una vez por id distinto
    for (const [id, name] of distinctIds) {
      const row = byId.get(id) ?? { name, wins: 0, played: 0 }
      row.played += 1
      if (won) row.wins += 1
      byId.set(id, row)
    }
  }
  return Array.from(byId.entries())
    .map(([id, r]) => ({ id, name: r.name, wins: r.wins, played: r.played, pct: r.played > 0 ? Math.round((r.wins / r.played) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct || b.played - a.played || a.name.localeCompare(b.name, 'es')) // D-24: cascada determinista
}

export function aggregateStatistics(entries: GameHistoryEntry[]) {
  const heroRows = buildRows(entries, e => e.players.filter(p => p.heroId).map(p => ({ id: p.heroId!, name: p.heroName ?? p.heroId! })))
  const villainRows = buildRows(entries, e => e.villainId ? [{ id: e.villainId, name: e.villainName ?? e.villainId }] : [])
  return { heroRows, villainRows }
}
```

### Anti-Patterns to Avoid

- **Leer `context.selection`/`context.counters` en crudo dentro de
  `buildHistoryEntry`:** usar SIEMPRE `resolvePlayerSlots`/`resolveVillainId` de
  `engine/selection.ts` — son la normalización defensiva ya escrita y testeada; releer el
  campo crudo reintroduce el riesgo de un `localStorage` manipulado que ya se resolvió en
  Fase 6/7.
- **Mutar `entries` in situ al borrar una entrada:** el precedente de todo el motor
  (`selection.ts`, `counters.ts`) es reasignación completa —
  `entries.filter(e => e.id !== id)` produce un array nuevo; un `splice` en el array
  existente no dispararía la escritura de vuelta a `localStorage` si en algún punto se
  envuelve en un `ref`/`computed` reactivo.
- **Que un componente (`HistoryEntryCard.vue`, `historico.vue`, `estadisticas.vue`)
  importe `~~/engine/*` directamente:** viola la única costura reactiva
  (`useGameSession.ts` es la única que hoy tiene ese privilegio); esta fase necesita un
  composable hermano (p. ej. `useGameHistory.ts`) que envuelva `loadHistory`/
  `appendHistoryEntry`/`removeHistoryEntry`/`aggregateStatistics` para que las pantallas
  sigan siendo tontas.
- **Usar `useLocalStorage` de VueUse para el histórico:** contradice la razón explícita ya
  documentada en la cabecera de `usePersistedSession.ts` (WR-02) para todo el resto de la
  app — sería una segunda filosofía de storage conviviendo con la primera.
- **Hacer `await` de nada en el flujo de registro:** todas las escrituras son
  `localStorage` síncronas; no hay ninguna operación asíncrona real en esta fase (Firestore
  no existe todavía) — si el planner introduce un `async`/`await` en el punto de enganche,
  es una señal de que algo de la Fase 10 se está adelantando por error.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirmación de borrado destructivo | Un modal nuevo con su propio diseño | `ConfirmDialog.vue` ya existente, `destructive: true` | Ya es la única superficie destructiva de la app, ya verificada en táctil; D-20 lo reutiliza explícitamente |
| Rótulo de jugador sin nombre | Una función nueva "Jugador N" | `resolvePlayerLabel` de `useHeroSearch.ts` | Un solo sitio, ya testeado, ya reutilizado por Fase 7 y Fase 8 |
| Formateo de fecha/hora | `toLocaleDateString`/`Intl.DateTimeFormat` | Formateador propio en `engine/history.ts` (D-21) | El propio D-21 lo exige explícitamente para que los tests sean deterministas en CI sin depender del locale del runner |
| Persistencia y parseo defensivo de JSON en localStorage | Un segundo fichero de storage, o `try/catch` disperso por los componentes | Extender `usePersistedSession.ts` reutilizando `readRaw`/`writeRaw`/`removeRaw` | Esos tres helpers ya son SSR-safe, a prueba de modo privado/cuota y de JSON corrupto — reimplementarlos sería duplicar exactamente la lógica que ya existe |
| Migraciones de esquema de storage | Un sistema de migración genérico | El mismo patrón `formatVersion` de `engine/persistence.ts`, reutilizado a propósito por D-13 en `tga:history` | Es el patrón de migración que el proyecto ya conoce y ya tiene un precedente probado (`PersistedPosition.formatVersion`) |

**Key insight:** Todo lo "nuevo" de esta fase es composición de piezas ya construidas y
verificadas en las Fases 1, 6 y 7. La disciplina de "componentes tontos + funciones puras
testeadas en `engine/` + una única costura reactiva (`useGameSession.ts`, o su hermana para
histórico) + una única costura de storage (`usePersistedSession.ts`)" no admite
excepciones aquí — cualquier desviación de ese patrón (un componente que importa
`~~/engine/*`, un segundo fichero de storage, un formateador de fecha con `Intl`) es una
regresión de arquitectura, no una simplificación.

## Common Pitfalls

### Pitfall 1: Insertar el diálogo de resultado en el punto equivocado de `onEndGameConfirm`

**What goes wrong:** Si el diálogo nuevo se inserta después de `session.value = null` o
después de `clear(gameId)`, los datos que `buildHistoryEntry` necesita (villano, héroes,
nombres, `startedAt`, `round`) ya no existen.
**Why it happens:** El orden actual de `onEndGameConfirm` (`app/pages/[game]/index.vue`)
tiene 6 pasos que se leen como una secuencia lineal de limpieza; es fácil insertar código
nuevo al final "porque es donde se cierra la partida" en vez de leer el comentario `D-U4`
que marca ese orden como "exacto, no cosmético".
**How to avoid:** El diálogo se inserta **entre el paso 3 (`silence()`) y el paso 4
(`session.value = null`)** — exactamente donde `09-CONTEXT.md` (Integration Points) lo
fija. Los pasos 4-6 se ejecutan sin cambiar una línea, después de que
`appendHistoryEntry` ya haya corrido (o el usuario haya tocado "Salir sin registrar").
**Warning signs:** Un `git diff` que toca los pasos 4-6 de `onEndGameConfirm`, o que lee
`session.value` después de haberlo puesto a `null`.

### Pitfall 2: `writeRaw()` falla en silencio y nadie se entera (D-03)

**What goes wrong:** `writeRaw()` en `usePersistedSession.ts` está diseñado para nunca
lanzar (modo privado, cuota agotada) — si `appendHistoryEntry` no informa de si la
escritura tuvo éxito, el grupo cree que la partida quedó guardada cuando no.
**Why it happens:** El patrón `void` de la mayoría de funciones de esta capa
(`save`, `clear`, `saveVoicePreference`) invita a copiar la misma firma para
`appendHistoryEntry` — pero el histórico es el único dato de la app que no se puede
reconstruir, a diferencia del progreso de partida (que se puede volver a jugar).
**How to avoid:** `appendHistoryEntry` debe devolver `boolean` (éxito/fallo), no `void` —
la única función de esta firma en toda la costura que rompe el patrón `void`, y es
deliberado (D-03 lo marca como "la decisión con más consecuencias estructurales" de esta
fase). El aviso (`HistorySavedNotice`) refleja ese resultado.
**Warning signs:** Una implementación de `appendHistoryEntry` tipada como `(entry) => void`.

### Pitfall 3: El histórico se borra sin querer al llamar a `clear(gameId)`

**What goes wrong:** Si la clave `tga:history` se deriva de `storageKey(gameId)` o se
borra dentro de la misma función `clear()`, «Partida terminada» destruiría el histórico
que HIST-09 exige preservar.
**Why it happens:** `clear(gameId)` ya existe y es tentador reutilizarla sin revisar que
solo borra `storageKey(gameId)`.
**How to avoid:** Seguir el precedente EXACTO de `VOICE_KEY` (D-46): una constante de
clave independiente (`HISTORY_KEY = 'tga:history'`), sin sufijo de `gameId`, con sus
propias funciones (`loadHistory`, `appendHistoryEntry`, `removeHistoryEntry`) que nunca
son invocadas por `clear()`. Un test unitario explícito (`clear(gameId)` no debe afectar
`tga:history`) cierra este riesgo mecánicamente.
**Warning signs:** Cualquier cambio dentro del cuerpo de la función `clear()` existente.

### Pitfall 4: Ruta nueva no precacheada por el service worker (PITFALLS.md §9)

**What goes wrong:** `/historico` y `/estadisticas` se construyen y funcionan en
`nuxt dev`/red, pero fallan la primera vez que se abren completamente offline tras
instalar la PWA, porque el crawler de prerender (`crawlLinks: false`) nunca las descubrió.
**Why it happens:** La navegación de esta app usa siempre `navigateTo()` en manejadores de
click, nunca `<NuxtLink>` con `href` real — exactamente la razón por la que
`nitro.prerender.routes` es una lista manual, no automática.
**How to avoid:** Añadir explícitamente `'/historico'` y `'/estadisticas'` a
`nitro.prerender.routes` en `nuxt.config.ts` (hoy `['/', '/marvel-champions']`). El
`globPatterns` de Workbox (`**/*.{js,css,html}`) ya cubre el HTML resultante sin tocar el
bloque `pwa` — pero esto se **verifica sobre una build real** (`nuxt generate` +
inspección de `.output/public`), no se da por hecho.
**Warning signs:** Un `nuxt generate` cuyo `.output/public` no contiene
`historico/index.html` ni `estadisticas/index.html`.

### Pitfall 5: Confundir `null` (sin selección) con «—» (sin dato numérico)

**What goes wrong:** Mostrar «—» donde `villainId` es `null` (SEL-09, selección
opcional) en vez de «Sin villano», o viceversa, mostrar «Sin villano» donde `durationMs`
es `null` por una sesión de v1.7 sin `startedAt`.
**Why it happens:** Ambos son "ausencia de dato", pero de naturaleza distinta: uno es
"el grupo eligió no seleccionar" (un hecho conocido) y el otro es "no se puede saber"
(un hecho desconocido) — `09-UI-SPEC.md` §4 ya distingue esto explícitamente y asigna
palabras a uno y el glifo `—` al otro.
**How to avoid:** Seguir la tabla exacta de `09-UI-SPEC.md` §4: `villainId: null` →
`"Sin villano"`; `durationMs: null` → `"—"`; entrada totalmente sin selección → `"Sin
héroes ni villano anotados"`. Nunca intercambiar los dos mecanismos.
**Warning signs:** Un solo helper `formatOrDash(value)` usado indistintamente para ambos
casos.

### Pitfall 6: Doble fuente de verdad si `/estadisticas` mezcla localStorage y Firestore

**What goes wrong:** Aunque Firestore no exista en el código de esta fase, un diseño de
composable que "deje preparado" un merge de fuentes (p. ej. una prop `source` o un branch
condicional "si hay Firestore, usar eso") reintroduce el riesgo documentado en
`PITFALLS.md` §8 antes de que la Fase 10 siquiera empiece.
**Why it happens:** La tentación de "dejarlo ya conectado para la fase siguiente" es
precisamente el tipo de adelanto que el criterio de éxito nº 5 del ROADMAP prohíbe.
**How to avoid:** `loadHistory()`/`aggregateStatistics()` no aceptan ningún parámetro de
"fuente" ni contienen ninguna rama condicional sobre red/Firestore — son funciones puras
sobre el array que ya está en `localStorage`, punto. Ninguna línea de código de esta fase
menciona `firebase`/`firestore`/`sync`.
**Warning signs:** Cualquier import, comentario o nombre de variable que mencione
Firestore/Firebase/sync en los ficheros de esta fase.

## Code Examples

### Extensión de `usePersistedSession.ts` (patrón exacto a seguir)

```typescript
// Añadido a app/composables/usePersistedSession.ts, junto a VOICE_KEY —
// misma disciplina: constante de clave SIN sufijo de gameId, helpers
// imperativos, reutiliza readRaw/writeRaw/removeRaw ya existentes.
const HISTORY_KEY = 'tga:history'
const HISTORY_FORMAT_VERSION = 1

interface HistoryEnvelope {
  formatVersion: 1
  entries: GameHistoryEntry[]
}

function isGameHistoryEntry(value: unknown): value is GameHistoryEntry {
  // Validación por forma mínima, mismo criterio que isPersistedPosition:
  // objeto con las claves imprescindibles, nunca lanza.
  if (!value || typeof value !== 'object') return false
  const c = value as Record<string, unknown>
  return typeof c.id === 'string' && typeof c.gameId === 'string'
    && (c.result === 'won' || c.result === 'lost')
    && typeof c.recordedAt === 'string'
}

// dentro de usePersistedSession()
function loadHistory(): GameHistoryEntry[] {
  const raw = readRaw(HISTORY_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Partial<HistoryEnvelope>
    if (parsed.formatVersion !== HISTORY_FORMAT_VERSION) return [] // D-13: punto de migración futuro
    if (!Array.isArray(parsed.entries)) return []
    // D-13: descarta entrada a entrada, nunca tira el array entero por una rota
    return parsed.entries.filter(isGameHistoryEntry)
  }
  catch {
    return []
  }
}

function appendHistoryEntry(entry: GameHistoryEntry): boolean {
  // D-03: devuelve boolean, ROMPE el patrón void del resto de esta capa a propósito.
  const current = loadHistory()
  const envelope: HistoryEnvelope = { formatVersion: HISTORY_FORMAT_VERSION, entries: [entry, ...current] }
  const before = readRaw(HISTORY_KEY)
  writeRaw(HISTORY_KEY, JSON.stringify(envelope))
  const after = readRaw(HISTORY_KEY)
  return after !== before && after !== undefined // detecta si writeRaw realmente escribió (modo privado/cuota lo dejaría igual)
}

function removeHistoryEntry(id: string): void {
  const current = loadHistory()
  const envelope: HistoryEnvelope = {
    formatVersion: HISTORY_FORMAT_VERSION,
    entries: current.filter(e => e.id !== id), // reasignación, nunca splice in situ
  }
  writeRaw(HISTORY_KEY, JSON.stringify(envelope))
}
```

**Nota sobre la detección de fallo en `appendHistoryEntry`:** comparar `readRaw` antes y
después es una forma; otra igualmente válida es que `writeRaw` en sí exponga si el
`try` interno lanzó (requeriría cambiar la firma interna de `writeRaw`, hoy `void`). El
planner debe elegir un mecanismo concreto y testearlo con un mock de
`window.localStorage.setItem` que lance (el mismo mecanismo que ya se usaría para testear
el modo privado) — la forma exacta es una decisión de implementación, no una decisión de
producto ya cerrada.

### Extensión de `engine/types.ts` (campos aditivos, sin bump de versión)

```typescript
// SessionContext gana startedAt — aditivo, D-07, mismo patrón que
// selection/counters (Fases 6/7). undefined es un estado transitorio real
// SOLO durante la migración desde v1.7 (D-10), nunca escrito por start().
export interface SessionContext {
  playerCount: number
  difficulty: Difficulty
  selection?: HeroSelection
  counters?: CounterState
  startedAt?: number // epoch ms; D-07: fijado UNA VEZ en start(), nunca reescrito al reanudar
  [key: string]: unknown
}

export type LossCause = 'mainSchemeCompleted' | 'heroesEliminated'

export interface GameHistoryEntry {
  id: string
  gameId: string
  result: 'won' | 'lost'
  lossCause: LossCause | null // D-06: null cuando result === 'won'
  villainId: string | null
  villainName: string | null // D-11: nombre congelado
  players: { heroId: string | null, heroName: string | null, playerName: string }[]
  difficulty: Difficulty
  playerCount: number
  round: number // D-09: "hasta la ronda N"
  durationMs: number | null // D-10: null si no hay startedAt
  recordedAt: string // ISO, momento del registro
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `ConfirmDialog` genérico de 2 botones para «Partida terminada» | `GameOutcomeDialog` de 4 botones que sustituye al anterior (D-01/D-02) | Esta fase | El componente `ConfirmDialog.vue` en sí NO cambia (sigue sirviendo al flujo de borrado de histórico y al descarte de partida) — solo cambia qué se monta en el punto de «Partida terminada» |
| `SessionContext` sin noción de tiempo | `SessionContext.startedAt` (D-07) | Esta fase | Primer campo temporal del motor; sienta el patrón para cualquier futura necesidad de medir tiempo en el motor |
| `usePersistedSession.ts` con una clave de progreso + una de voz | + clave de histórico (`tga:history`) | Esta fase | Tercera clave independiente en la misma costura — confirma que el patrón escala a N claves sin fricción |

**Deprecated/outdated:** Ninguno — esta fase no reemplaza ningún patrón previo, solo lo
extiende. `engine/persistence.ts` permanece sin cambios (D-07 lo confirma explícitamente).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | El mecanismo exacto para que `appendHistoryEntry` detecte un fallo de `writeRaw()` (comparar antes/después vs. cambiar la firma interna de `writeRaw`) no está fijado por `09-CONTEXT.md`, solo el contrato de que debe devolver `boolean` | Code Examples | Si el planner elige un mecanismo frágil (p. ej. comparar longitudes de string en vez de contenido), un caso raro de escritura parcial podría no detectarse — bajo impacto, D-03 exige que exista el intento de detección, no una implementación específica |
| A2 | El punto exacto donde se resuelve el alias español del héroe (`heroName` congelado) — dentro de un composable envolvente vs. como argumento extra de `buildHistoryEntry` — es una decisión de implementación abierta, no cerrada por CONTEXT.md | Architecture Patterns §Pattern 1 | Bajo impacto: cualquiera de las dos formas produce el mismo dato final; solo afecta a qué tan "puro" queda `engine/history.ts` en su frontera con `app/data/spanish-hero-aliases.ts` |

**Nota:** ninguna de las dos asunciones anteriores contradice una decisión LOCKED de
`09-CONTEXT.md` — ambas son huecos de implementación que el propio CONTEXT.md ya marcó
como "Claude's Discretion" o dejó abiertos a la fase de planificación.

## Open Questions

1. **¿`appendHistoryEntry` compara antes/después de `readRaw` o cambia la firma interna de
   `writeRaw` para propagar el resultado del `try`?**
   - What we know: debe devolver `boolean` (D-03, LOCKED).
   - What's unclear: el mecanismo interno exacto de detección.
   - Recommendation: el planner elige uno de los dos y lo cubre con un test que mockea
     `window.localStorage.setItem` lanzando una excepción (simulando modo privado/cuota).

2. **¿Dónde vive exactamente la resolución del alias español (`heroName` congelado) —
   dentro de `engine/history.ts` recibiéndolo como parámetro, o en la capa de composable
   que llama a `buildHistoryEntry`?**
   - What we know: `engine/` no puede importar `app/data/spanish-hero-aliases.ts` (rompe
     la frontera pura del motor, mismo motivo que impide que `engine/types.ts` importe zod).
   - What's unclear: la forma exacta de la firma de `buildHistoryEntry` (¿recibe un mapa
     `heroId → spanishName` como argumento, o recibe ya los `players` con `heroName`
     resuelto desde fuera?).
   - Recommendation: el planner decide la firma exacta al escribir el primer test de
     `engine/__tests__/history.test.ts` — cualquiera de las dos formas satisface HIST-04
     sin romper la frontera engine/app.

## Environment Availability

No aplica — esta fase no depende de ninguna herramienta externa, servicio, runtime ni CLI
más allá de lo que el repo ya usa (Node/npm para Vitest, el propio navegador para
`localStorage`). Es una fase de código/contenido puro, sin instalación nueva.

## Security Domain

> `security_enforcement` no está declarado explícitamente en `.planning/config.json` según
> lo revisado en esta investigación — se trata como activado por defecto, pero el alcance
> real de esta fase es mínimo: no hay autenticación, no hay red, no hay entrada de usuario
> que llegue a un servidor (no existe servidor en runtime, es SSG).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No hay cuentas ni login en esta fase (ni en el proyecto) |
| V3 Session Management | no | No hay sesión de servidor; el "session" del motor es estado de cliente puro |
| V4 Access Control | no | Un solo usuario/dispositivo, sin roles |
| V5 Input Validation | parcial | El nombre de jugador ya se recorta a `PLAYER_NAME_MAX_LENGTH` (Fase 6, reutilizado, no nuevo); la entrada de histórico no acepta ningún campo de texto libre nuevo — todo son enums/ids/números derivados del propio motor, no tecleados por el usuario en esta fase |
| V6 Cryptography | no | No se cifra ni se firma nada; `localStorage` en claro, igual que el resto de la app |

### Known Threat Patterns for este stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| `localStorage` editado a mano (DevTools) con una entrada de histórico de forma inesperada | Tampering | `loadHistory()` valida por tipo/forma mínima entrada a entrada (D-13) y descarta silenciosamente la inválida — mismo patrón ya usado por `isPersistedPosition` |
| Un `id` de entrada colisiona con otro (baja probabilidad, sin `crypto.randomUUID`) | Tampering (integridad de datos, no de seguridad) | Timestamp + sufijo aleatorio de 6 caracteres alfanuméricos da un espacio de colisión bajísimo para el volumen real (decenas de partidas); no es una superficie de seguridad, es integridad de UI (una tarjeta duplicada visualmente en el peor caso, nunca una vulnerabilidad) |
| XSS vía nombre de jugador mostrado en la tarjeta de histórico | Tampering/Injection | Ya cubierto por la disciplina existente del proyecto: "Interpolación siempre, HTML crudo nunca" (T-01-01, `09-UI-SPEC.md` lo reitera) — Vue interpola por defecto de forma segura (`{{ }}`), y esta fase no introduce ningún `v-html` |

## Sources

### Primary (HIGH confidence)

- Lectura directa del código fuente del repo (`app/composables/usePersistedSession.ts`,
  `engine/persistence.ts`, `engine/types.ts`, `engine/selection.ts`, `engine/counters.ts`,
  `engine/header.ts`, `app/composables/useHeroSearch.ts`, `app/composables/
  useGameSession.ts`, `app/pages/[game]/index.vue`, `app/components/ConfirmDialog.vue`,
  `app/components/UpdateBanner.vue`, `app/components/VoiceUnavailableNotice.vue`,
  `app/components/GameSelectorScreen.vue`, `app/pages/index.vue`, `nuxt.config.ts`,
  `vitest.config.ts`, `package.json`, `engine/schema.ts`) — leído directamente en esta
  sesión, no de memoria.
- `.planning/phases/09-hist-rico-y-estad-sticas/09-CONTEXT.md` — 26 decisiones LOCKED, con
  citas textuales del Rules Reference v1.7 (p. 46, «Winning the Game»; «Eliminated»).
- `.planning/phases/09-hist-rico-y-estad-sticas/09-UI-SPEC.md` — contrato visual completo,
  ya aprobado en su estructura (pendiente de checker sign-off al momento de esta
  investigación).
- `.planning/research/ARCHITECTURE.md` §b, §c, §g (Chunk 5) — el punto de enganche exacto
  y el orden de construcción recomendado, verificado contra el código real (algunos
  números de línea citados ahí ya no coinciden exactamente tras las Fases 6-8, pero la
  lógica y el razonamiento siguen vigentes).
- `.planning/research/PITFALLS.md` §8, §9, §14 — riesgos de doble fuente de verdad,
  precache de rutas nuevas, y creep de alcance, todos verificados contra el estado actual
  del repo (`nuxt.config.ts` confirma que `crawlLinks: false` sigue vigente).
- `npm view zod version` / `npm view vitest version` — versiones actuales del registro,
  confirmando que no hace falta actualizar ninguna dependencia para esta fase.

### Secondary (MEDIUM confidence)

- `.planning/research/FEATURES.md` §d/§e y Open Questions 11-17 — ya resueltas por
  `09-CONTEXT.md`; citadas aquí solo para constatar que las preguntas abiertas de la
  investigación de milestone quedaron todas cerradas en la discusión de fase (incluida la
  discrepancia sobre "editar entradas" que `FEATURES.md` recomendaba como table-stakes y
  que `09-CONTEXT.md` deliberadamente diferió como HIST-10, con motivo explícito).

### Tertiary (LOW confidence)

- Ninguna. Esta investigación no se apoyó en WebSearch/fuentes externas no verificadas —
  el dominio completo de esta fase es interno al repo y a decisiones ya tomadas por el
  usuario.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — cero dependencias nuevas, todo verificado contra `package.json`
  y el registro npm.
- Architecture: HIGH — cada patrón está anclado a código real ya existente en el repo,
  leído en esta sesión, no inferido.
- Pitfalls: HIGH — los 6 pitfalls documentados provienen de comentarios explícitos del
  propio código (`D-U4`, `WR-02`, `D-46`) o de `PITFALLS.md` ya verificado contra el
  estado actual del repo, no de conjetura genérica.

**Research date:** 2026-09-10
**Valid until:** Estable mientras `09-CONTEXT.md`/`09-UI-SPEC.md` no cambien y no se
actualice `nuxt`/`vue`/`zod` a una versión mayor — sin fecha de caducidad corta, dado que
esta fase no depende de ningún servicio externo ni ecosistema de rápida evolución.
