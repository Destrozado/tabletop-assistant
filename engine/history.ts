// engine/history.ts
// Construcción y formateo puros de una entrada del histórico (Fase 9). Mismo
// contrato de pureza que `engine/selection.ts` (normalización defensiva,
// nunca muta su argumento, nunca lanza) y `engine/header.ts` (función pura
// que devuelve cadenas ya listas para pintar). Cero Vue, cero DOM, cero zod
// y cero import de `app/`: los nombres congelados (alias español) los
// resuelve SIEMPRE el llamador (composable de la capa de interfaz, plan
// 09-05) y llegan aquí como dato plano vía `FrozenNames` — este fichero no
// puede alcanzar ningún módulo bajo la carpeta de la interfaz.
import { resolvePlayerSlots, resolveVillainId } from './selection'
import type { GameHistoryEntry, GameOutcome, LossCause } from './types'
import type { EngineSession } from './types'

// Resuelve la Open Question 2 de 09-RESEARCH.md: los nombres congelados los
// resuelve el llamador y llegan como DATO PLANO. `heroNames` es un mapa
// `heroId → nombre congelado`; un `heroId` ausente del mapa se trata como
// «sin nombre conocido», nunca como error (D-11).
export interface FrozenNames {
  villainName: string | null
  heroNames: Record<string, string>
}

// Construye una entrada completa del histórico a partir de una sesión viva
// (a punto de destruirse), el resultado elegido en GameOutcomeDialog y los
// nombres congelados ya resueltos por el llamador. Devuelve un objeto
// NUEVO: no muta `session` ni `names` (disciplina de todo el motor).
export function buildHistoryEntry(
  session: EngineSession,
  outcome: GameOutcome,
  now: number, // inyectado desde fuera, nunca leído del reloj real aquí dentro — determinismo en test
  names: FrozenNames,
): GameHistoryEntry {
  const { context, round, gameId } = session

  // T-09-01: SIEMPRE por resolveVillainId/resolvePlayerSlots, normalizados
  // por tipo y con test propio — nunca context.selection en crudo.
  const villainId = resolveVillainId(context)
  const villainName = villainId !== null ? names.villainName : null

  const players = resolvePlayerSlots(context).map((slot) => {
    const heroName = slot.heroId !== null ? (names.heroNames[slot.heroId] ?? null) : null
    return {
      heroId: slot.heroId,
      heroName,
      playerName: slot.playerName,
    }
  })

  // T-09-02: durationMs solo se calcula con una guarda explícita — nunca 0
  // de relleno, nunca un negativo (un startedAt manipulado en el futuro cae
  // a null).
  const durationMs
    = typeof context.startedAt === 'number'
      && Number.isFinite(context.startedAt)
      && now >= context.startedAt
      ? now - context.startedAt
      : null

  // CR-01 (ronda 2): el motor no propaga un hueco que la frontera de
  // almacenamiento vaya a rechazar después — normaliza en origen, igual
  // que ya hace con `durationMs` arriba. Las tres líneas siguientes son el
  // mismo criterio defensivo aplicado a `difficulty`/`playerCount`/`round`:
  // un `context` parcial o manipulado (p. ej. una rama `resumed` que
  // adoptó un `context: {}`) no debe producir una `GameHistoryEntry` con
  // campos ausentes/`undefined`/`NaN` — eso es justo lo que
  // `isGameHistoryEntry` (la frontera de escritura) rechazaba en silencio.
  const difficulty = context.difficulty === 'expert' ? 'expert' : 'normal'
  // Reutiliza literalmente el criterio de `resolvePlayerSlots`
  // (engine/selection.ts:50): si `context.playerCount` no es un entero
  // positivo, el número de jugadores registrado es el que el propio motor
  // acaba de derivar (`players.length`) — nunca un hueco. Esto convierte en
  // invariante que `entry.playerCount === entry.players.length`.
  const playerCount = Number.isInteger(context.playerCount) && context.playerCount > 0
    ? context.playerCount
    : players.length
  // `round` (D-09): tal cual, se lee "hasta la ronda N", nunca round - 1 —
  // la copia no cambia, lo que cambia es de dónde puede venir el número.
  // Un `round` de `NaN`, `2.5` o `-4` no es una ronda; `1` es la única
  // cifra que esa copia puede afirmar sin mentir.
  const normalizedRound = Number.isInteger(round) && round >= 1 ? round : 1

  return {
    id: `${now}-${Math.random().toString(36).slice(2, 12)}`,
    gameId,
    result: outcome === 'won' ? 'won' : 'lost',
    lossCause: outcome === 'won' ? null : outcome,
    villainId,
    villainName,
    players,
    difficulty,
    playerCount,
    round: normalizedRound,
    durationMs,
    recordedAt: new Date(now).toISOString(),
  }
}

// D-06: contrastado con el Rules Reference v1.7 p. 46 ("Winning the Game")
// y "Eliminated". Estas dos cadenas son las MISMAS que
// `app/components/GameOutcomeDialog.vue` pinta en sus botones tras el
// prefijo "PERDIDA · " (UI-SPEC §Copywriting Contract) — si una cambia, la
// otra también.
export function describeLossCause(cause: LossCause): string {
  return cause === 'mainSchemeCompleted'
    ? 'Se completó el Plan Principal'
    : 'Todos los héroes eliminados'
}

// Doce meses abreviados en minúscula (D-21): formato "12 sep 2026", sin
// ambigüedad día/mes y legible a distancia.
export const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// D-21: sin depender de las utilidades de localización del runtime — los
// tests deben comparar cadenas exactas sin depender del locale del runner
// de CI. Un dato ilegible se trata como ausencia, nunca como error
// (T-09-04): '—' ante una fecha no parseable.
export function formatEntryDate(recordedAt: string): string {
  const d = new Date(recordedAt)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`
}

// D-10/D-21: '—' para null o para cualquier valor no finito (nunca 0, nunca
// inventado). Formato "1 h 40 min" a partir de una hora, "N min" por debajo.
export function formatEntryDuration(durationMs: number | null): string {
  if (durationMs === null || !Number.isFinite(durationMs)) return '—'
  const totalMinutes = Math.round(durationMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  return `${hours} h ${minutes} min`
}

// HIST-07/WR-06: garantía mecánica de "de la más reciente a la más antigua"
// incluso si el array almacenado llegara desordenado por edición manual. El
// orden se calcula por INSTANTE (Date.parse), no por comparación de cadenas:
// una comparación de cadenas ISO solo es cronológica si todas las cadenas
// tienen exactamente el mismo formato y depende además de la colación del
// ICU del dispositivo — dos representaciones válidas del mismo instante con
// formatos distintos (p. ej. con offset explícito frente a "Z") pueden
// ordenarse al revés bajo comparación de cadenas. Una entrada con
// `recordedAt` no parseable (`Date.parse` devuelve `NaN`) se trata como
// "infinitamente antigua" y cae al final, de forma determinista, sin alterar
// el orden relativo de las demás. Este orden no es solo cosmético: alimenta
// en `engine/statistics.ts` (D-26) la elección del nombre congelado
// ganador, que asume que el primer elemento del array es el más reciente.
// Devuelve un array NUEVO, sin mutar la entrada; `Array.prototype.sort` es
// estable en todos los motores soportados, así que dos entradas con el
// mismo instante conservan su orden de inserción — preserva la garantía de
// `appendHistoryEntry` de anteponer la entrada nueva incluso si dos
// registros caen en el mismo milisegundo.
export function sortEntriesByRecency(entries: GameHistoryEntry[]): GameHistoryEntry[] {
  const instant = (entry: GameHistoryEntry): number => {
    const parsed = Date.parse(entry.recordedAt)
    return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
  }
  return [...entries].sort((a, b) => instant(b) - instant(a))
}
