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
import type { EngineSession, FrozenEndInstant } from './types'

// Resuelve la Open Question 2 de 09-RESEARCH.md: los nombres congelados los
// resuelve el llamador y llegan como DATO PLANO. `heroNames` es un mapa
// `heroId → nombre congelado`; un `heroId` ausente del mapa se trata como
// «sin nombre conocido», nunca como error (D-11).
export interface FrozenNames {
  villainName: string | null
  heroNames: Record<string, string>
}

// CR-02 (ronda 3): `heroNames` se indexa con un `heroId` que en última
// instancia viene de `localStorage` (dato no confiable, `resolvePlayerSlots`
// solo exige "cadena no vacía", sin contrastar contra ningún catálogo). La
// guarda existe por DOS motivos, igual que `durationMs` más abajo: la clave
// es dato no confiable (podría ser `'constructor'`, `'__proto__'`, etc., y
// resolver por la cadena de prototipos de `Object`) Y el valor asociado
// tampoco está garantizado por el tipo TypeScript (una promesa de
// compilación, no de ejecución — el llamador podría entregar cualquier
// cosa). `Object.hasOwn` descarta la cadena de prototipos; el `typeof`
// descarta un valor de tipo equivocado. Nunca lanza.
function resolveFrozenHeroName(heroNames: unknown, heroId: string): string | null {
  if (typeof heroNames !== 'object' || heroNames === null) return null
  if (heroId.length === 0) return null
  if (!Object.hasOwn(heroNames, heroId)) return null
  const value = (heroNames as Record<string, unknown>)[heroId]
  return typeof value === 'string' ? value : null
}

// IN-05 (09-REVIEW.md, cerrado en la quick 260923-3rl): el id ya no se
// construye con el sufijo base36 de `Math.random()`
// (`Math.random().toString(36).slice(2, 12)` daba entre 0 y 10 caracteres —
// `Math.random() === 0` producía un sufijo VACÍO, incumpliendo el propio
// regex que el test antiguo fijaba). `crypto.randomUUID()` (disponible en
// todos los navegadores objetivo, contexto seguro) es la vía principal;
// invocado COMO MÉTODO de `globalThis.crypto` (una referencia suelta —
// `const fn = globalThis.crypto.randomUUID; fn()` — lanza «Illegal
// invocation» en navegador, porque pierde el `this` que la implementación
// nativa necesita). Decisión propia (documentada en el SUMMARY): UUID PURO,
// sin prefijo de instante — el orden del histórico lo da `recordedAt` vía
// `sortEntriesByRecency`, nunca el id; `firestore.rules` (Fase 10, D-03)
// solo exige que el id de documento sea `string`, así que un UUID es un id
// de documento válido. Los ids antiguos ya escritos en `localStorage` y en
// Firestore (con el formato `<now>-<sufijo>`) no se migran: ambos formatos
// son igual de válidos como `string`, y nada en el resto del sistema
// distingue de qué generador salió un id.
//
// Respaldo, solo alcanzable fuera de un contexto seguro (p. ej. un servidor
// de desarrollo abierto por IP de la LAN en la tablet, sin HTTPS): mismo
// formato `<now>-<sufijo>` que antes, pero el sufijo se rellena a la
// derecha con '0' hasta 10 caracteres para que nunca quede vacío — el
// contrato de la cabecera de este fichero (`buildHistoryEntry` nunca lanza)
// se mantiene en los dos caminos.
function generateHistoryEntryId(now: number): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  const suffix = Math.random().toString(36).slice(2, 12).padEnd(10, '0')
  return `${now}-${suffix}`
}

// freezeEndInstant (WR-06 ronda 4, quick 260923-3rm): sella el instante
// congelado del PRIMER «Partida terminada» en la posición actual de
// `session` — pura, nunca muta su argumento, nunca lanza. Devuelve una
// sesión NUEVA con `context.endedAt` cuando no había sello válido para la
// posición actual; devuelve la MISMA referencia (`session`, sin clonar)
// cuando el sello ya existente sigue aplicando (conserva el PRIMER `at`,
// nunca lo pisa) o cuando no hay nada que sellar (cursor fuera de rango,
// `now` no finito).
//
// Por qué el sello se valida contra `runtimeId`+`round` y no se sustituye a
// la primera: un reintento de registro (tras un fallo de escritura del
// histórico) vuelve a llamar a este punto desde la MISMA posición — ahí es
// donde D-08 exige congelar el instante real del desenlace, no el del
// reintento. Si la sesión avanzara a otro nodo o cambiara de ronda antes del
// reintento (D-08 tal cual: sin sello, `buildHistoryEntry` sigue usando
// `now`), el sello viejo ya no describe la posición actual y se sustituye
// por uno nuevo — nunca se conserva un sello de un desenlace distinto.
export function freezeEndInstant(session: EngineSession, now: number): EngineSession {
  if (!Number.isFinite(now)) return session

  const node = session.sequence[session.cursor]
  if (!node) return session

  const existing = session.context.endedAt as FrozenEndInstant | undefined
  const sigueAplicando
    = existing !== null
      && typeof existing === 'object'
      && typeof existing.at === 'number'
      && Number.isFinite(existing.at)
      && typeof existing.runtimeId === 'string'
      && existing.runtimeId === node.runtimeId
      && typeof existing.round === 'number'
      && existing.round === session.round

  if (sigueAplicando) return session

  return {
    ...session,
    context: {
      ...session.context,
      endedAt: { at: now, runtimeId: node.runtimeId, round: session.round },
    },
  }
}

// resolveFrozenEndInstant (WR-06 ronda 4): el instante de referencia que
// `buildHistoryEntry` usa para `durationMs`/`recordedAt` — el `at` del
// sello SOLO si sigue describiendo la posición actual de `session` (mismo
// `runtimeId`/`round` que `session.sequence[session.cursor]`/`session.round`)
// y es cronológicamente coherente (`at <= now`, y `at >= startedAt` cuando
// `startedAt` es finito); en cualquier otro caso —incluido cualquier sello
// corrupto: `at` no finito, `endedAt` no es un objeto, `runtimeId` no es
// cadena— devuelve `now` (D-08 tal cual, el camino sin sello). Nunca lanza.
function resolveFrozenEndInstant(session: EngineSession, now: number): number {
  const stamp = session.context.endedAt as FrozenEndInstant | undefined
  if (stamp === null || typeof stamp !== 'object') return now
  if (typeof stamp.at !== 'number' || !Number.isFinite(stamp.at)) return now
  if (typeof stamp.runtimeId !== 'string' || typeof stamp.round !== 'number') return now

  const node = session.sequence[session.cursor]
  if (!node || stamp.runtimeId !== node.runtimeId || stamp.round !== session.round) return now
  if (stamp.at > now) return now

  const startedAt = session.context.startedAt
  if (typeof startedAt === 'number' && Number.isFinite(startedAt) && stamp.at < startedAt) return now

  return stamp.at
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
  // CR-02 (ronda 3): `villainName` es el campo HERMANO de `heroNames` dentro
  // del mismo objeto `FrozenNames` — lo produce el mismo llamador y
  // `isGameHistoryEntry` le exige exactamente el mismo contrato
  // (`null | string`). Endurecer solo `heroNames` y dejar este campo sin
  // guarda de tipo sería repetir, dentro del mismo plan, el patrón de
  // «un lado del contrato se endurece y el vecino queda sin revisar» que
  // lleva tres rondas reabriendo esta fase.
  const villainId = resolveVillainId(context)
  const villainName = villainId !== null && typeof names.villainName === 'string'
    ? names.villainName
    : null

  const players = resolvePlayerSlots(context).map((slot) => {
    const heroName = slot.heroId !== null ? resolveFrozenHeroName(names.heroNames, slot.heroId) : null
    return {
      heroId: slot.heroId,
      heroName,
      playerName: slot.playerName,
    }
  })

  // WR-06 (ronda 4, quick 260923-3rm): instante de referencia para
  // durationMs/recordedAt — el sello congelado si sigue aplicando a la
  // posición actual (`resolveFrozenEndInstant`), o `now` en cualquier otro
  // caso (D-08 tal cual, camino sin cambios cuando no hay sello).
  const referenceInstant = resolveFrozenEndInstant(session, now)

  // T-09-02: durationMs solo se calcula con una guarda explícita — nunca 0
  // de relleno, nunca un negativo (un startedAt manipulado en el futuro cae
  // a null).
  const durationMs
    = typeof context.startedAt === 'number'
      && Number.isFinite(context.startedAt)
      && referenceInstant >= context.startedAt
      ? referenceInstant - context.startedAt
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
    id: generateHistoryEntryId(now),
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
    recordedAt: new Date(referenceInstant).toISOString(),
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
// BF-03 (09-17, barrido de fronteras, WR-06): tres cifras imposibles que el
// código anterior podía pintar y que ninguna mesa real anotaría así.
// 1) `durationMs < 0` (un `startedAt` manipulado hacia el futuro) pasaba
//    `Number.isFinite` sin problema y producía minutos/horas negativos
//    (`Math.floor(-100/60) === -2`, `-100 % 60 === -40` ⇒ «-2 h -40 min») —
//    ahora degrada a «—», igual que cualquier otro dato que no se puede
//    afirmar. 2) Una partida de menos de 1 minuto (p. ej. 20 s) redondeaba a
//    «0 min»; la duración mínima que la copy puede afirmar sin mentir es
//    «1 min», mismo razonamiento que `round` mínimo es 1 en
//    `buildHistoryEntry` (09-12). 3) Exactamente 1h/2h/etc. pintaba
//    «1 h 0 min», el minuto redundante que ningún reloj de mesa escribe —
//    ahora se omite cuando los minutos son exactamente 0.
export function formatEntryDuration(durationMs: number | null): string {
  if (durationMs === null || !Number.isFinite(durationMs) || durationMs < 0) return '—'
  const totalMinutes = Math.max(1, Math.round(durationMs / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
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
