// app/composables/usePersistedSession.ts
// Única capa de TODA la app que toca localStorage. Clave namespaced
// `tga:progress:<gameId>`.
//
// WR-02: `load`/`save`/`clear`/`loadVoicePreference`/`saveVoicePreference` son
// ayudantes IMPERATIVOS — ningún llamador (`app/pages/[game]/index.vue`,
// `useVoiceAnnouncer.ts`) consume un `.value` reactivo de estas funciones, así
// que no hay ninguna razón para pasar por los envoltorios reactivos de
// VueUse aquí: crear esa envoltura reactiva en el CUERPO de cada función (en
// vez de una sola vez en el cuerpo del composable) registraba un watcher y un
// listener `window` `storage` nuevos en cada llamada, y ninguno de los dos se
// desechaba jamás fuera de una `setup()`/hook de ciclo de vida síncronos —
// exactamente el caso de `save()`, invocado desde el callback de un
// `watchDebounced` en cada paso de partida. Leer/escribir `window.localStorage`
// directamente aquí elimina el problema de raíz en vez de acotarlo: cero
// watchers, cero listeners, nada que desechar.
//
// SSR-safe a mano (antes lo daba VueUse gratis): todo acceso está detrás de
// `typeof window === 'undefined'` — en el servidor (prerender) esta capa se
// limita a devolver el valor por defecto, nunca toca un global de navegador.
//
// El motor (`~~/engine/persistence`) es quien define la FORMA de lo
// persistido y la regla de reanudación; este composable solo serializa y
// deserializa objetos planos — cualquier fallo de parseo (JSON corrupto) o de
// acceso al propio storage (modo privado, cuota, contexto restringido) se
// trata como ausencia de dato, nunca como error que rompa la interacción.
import { toPersistedPosition } from '~~/engine/persistence'
import type { PersistedPosition } from '~~/engine/persistence'
import type { EngineSession, GameHistoryEntry, HistoryPlayerEntry } from '~~/engine/types'

const KEY_PREFIX = 'tga:progress:'

// D-46: la preferencia de voz vive en su PROPIA clave, sin sufijo de
// gameId — `clear(gameId)` (más abajo) borra solo `storageKey(gameId)` y
// nunca esta constante. Si colgara de `storageKey`, «Empezar partida nueva»
// (que llama a `clear`) reactivaría la voz sola en cada partida, justo lo
// que D-46 prohíbe: la preferencia debe sobrevivir a partida nueva, al
// descarte de progreso y al cambio de juego.
const VOICE_KEY = 'tga:voice-enabled'

// D-13/HIST-09 (Fase 9): el histórico vive en su PROPIA clave, sin sufijo de
// gameId ni derivada de `storageKey` — exactamente el mismo razonamiento que
// D-46 aplica a `VOICE_KEY` arriba. Hay un único histórico para toda la app
// (D-15), y «Partida terminada» (que llama a `clear(gameId)`) no puede
// tocarlo jamás: el histórico es el único dato de la app que no se puede
// reconstruir si se pierde.
const HISTORY_KEY = 'tga:history'
const HISTORY_FORMAT_VERSION = 1

// Envoltorio versionado del histórico completo (D-13): `formatVersion` es el
// punto de migración futuro si la forma de `GameHistoryEntry` cambiara algún
// día — hoy solo existe la versión 1, y cualquier otra se trata como
// ausencia de dato (ver `loadHistory`).
interface HistoryEnvelope {
  formatVersion: 1
  entries: GameHistoryEntry[]
}

function storageKey(gameId: string): string {
  return `${KEY_PREFIX}${gameId}`
}

// D-47: sin preferencia guardada (ausente, corrupta, editada a mano), la voz
// está activada. Mismo criterio defensivo que `isPersistedPosition` ya
// aplica al progreso — un dato ilegible se trata como ausencia, nunca como
// error. Solo el booleano `false` exacto silencia.
export function normalizeVoicePreference(value: unknown): boolean {
  return value !== false
}

// Valida la FORMA completa de `PersistedPosition`, no solo la presencia de
// `formatVersion` (CR-01): un objeto parcial (residuo de una build anterior
// con otra forma de dato, edición manual en DevTools, o una escritura a
// medias) debe tratarse como ausencia de dato, nunca como una sesión
// resumible a medio construir. `context` en concreto debe ser un objeto —
// es justo el campo cuya ausencia hacía crashear la pantalla "El contenido
// ha cambiado" en `useGameSession.ts`.
function isPersistedPosition(value: unknown): value is PersistedPosition {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return 'formatVersion' in candidate
    && 'contentVersion' in candidate
    && 'runtimeId' in candidate
    && 'round' in candidate
    && 'context' in candidate
    && typeof candidate.context === 'object' && candidate.context !== null
}

// CR-01 (Fase 9): valida la FORMA de un elemento de `players[]` en la
// frontera de almacenamiento. Nunca lanza. `players: [null]` o
// `players: [{}]` hoy superan `Array.isArray(candidate.players)` sin que
// nada compruebe sus elementos, y tumban `/historico`
// (`buildHistoryCardView` desreferencia `player.heroId` sin guarda previa).
// `heroId`/`heroName` admiten `null` (D-12: hueco sin héroe asignado) o
// `string`; `playerName` exige `string`.
function isHistoryPlayerEntry(value: unknown): value is HistoryPlayerEntry {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (candidate.heroId === null || typeof candidate.heroId === 'string')
    && (candidate.heroName === null || typeof candidate.heroName === 'string')
    && typeof candidate.playerName === 'string'
}

// Valida la FORMA mínima de `GameHistoryEntry` (T-09-11): nunca lanza, y
// cualquier entrada que no cumpla se descarta SIN tirar el resto del
// histórico (D-13) — mismo criterio defensivo que `isPersistedPosition` de
// arriba. CR-01/CR-02 (Fase 9): el dato viene de `window.localStorage`, que
// es ENTRADA NO FIABLE (puede venir de una build futura o pasada, de una
// edición manual en DevTools, o de una escritura interrumpida) — no de
// `engine/history.ts`, que ya construye la entrada bien tipada. Esta
// frontera debe ser al menos tan estricta como lo que `engine/statistics.ts`
// y `useGameHistory.ts` ya asumen al consumir el dato (p. ej.
// `a.name.localeCompare(b.name, 'es')`, que exige `name` siempre `string`).
// `recordedAt` sigue exigiéndose solo como `string`: rechazar una fecha no
// parseable escondería una partida completa que `formatEntryDate` ya sabe
// degradar a «—» (D-21).
// WR-03: `round`/`playerCount`/`durationMs` se validan por FINITUD
// (`Number.isFinite`), no solo por `typeof === 'number'` —
// `typeof NaN === 'number'` es `true`, así que la comprobación anterior
// dejaba pasar `NaN`/`Infinity` y la tarjeta pintaba «Hasta la ronda NaN».
// `Number.isFinite` ya implica `typeof === 'number'` (no coacciona su
// argumento), así que sustituye a las tres comprobaciones sin añadir nada
// extra. Es el mismo criterio que `engine/history.ts` ya aplica a
// `startedAt`/`durationMs`.
function isGameHistoryEntry(value: unknown): value is GameHistoryEntry {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.id === 'string'
    && typeof candidate.gameId === 'string'
    && (candidate.result === 'won' || candidate.result === 'lost')
    && typeof candidate.recordedAt === 'string'
    && Array.isArray(candidate.players)
    && Number.isFinite(candidate.round)
    && Number.isFinite(candidate.playerCount)
    && (candidate.villainId === null || typeof candidate.villainId === 'string')
    && (candidate.villainName === null || typeof candidate.villainName === 'string')
    && (candidate.difficulty === 'normal' || candidate.difficulty === 'expert')
    && (candidate.lossCause === null || candidate.lossCause === 'mainSchemeCompleted' || candidate.lossCause === 'heroesEliminated')
    && (candidate.durationMs === null || Number.isFinite(candidate.durationMs))
    && candidate.players.every(isHistoryPlayerEntry)
}

// Los cuatro ayudantes siguientes son el único punto que toca
// `window.localStorage` de verdad. `undefined` significa "sin dato" tanto en
// SSR (no hay `window`) como si el propio storage lanza (modo privado, cuota,
// contexto restringido) — el llamador no distingue el motivo, solo la
// ausencia.
function readRaw(key: string): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    return window.localStorage.getItem(key) ?? undefined
  }
  catch {
    return undefined
  }
}

// D-03 (Fase 9): devuelve si la escritura llegó a completarse. Se propaga
// directamente el resultado del `try` interno — se descarta a propósito
// comparar `readRaw` antes/después (produciría un falso negativo si el
// contenido escrito coincidiera con el anterior, y obliga a una lectura y
// un parseo de más). `save`/`saveVoicePreference` (más abajo) siguen
// IGNORANDO este booleano sin cambiar ni una línea: VOZ-06/D-51 exigen que
// un fallo de almacenamiento nunca rompa next()/prev()/toggle(), así que el
// fallo sigue siendo silencioso para esos dos llamadores. El ÚNICO llamador
// de este fichero que MIRA el resultado es `appendHistoryEntry` — el
// histórico es el único dato de la app que no se puede reconstruir, así que
// el grupo tiene que enterarse si el dispositivo no dejó escribir.
function writeRaw(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(key, value)
    return true
  }
  catch {
    // Fallo silencioso para save()/saveVoicePreference() (privado/cuota):
    // VOZ-06/D-51 exigen que un fallo de almacenamiento nunca rompa
    // next()/prev()/toggle(). appendHistoryEntry() sí propaga este `false`.
    return false
  }
}

function removeRaw(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  }
  catch {
    // Ídem — un fallo al borrar no debe romper "Empezar partida nueva".
  }
}

// CR-03 (Fase 9): tres resultados DISTINGUIBLES de leer el envoltorio de
// `tga:history` en crudo, ANTES de decidir si una escritura puede proceder.
// 'empty' es la ÚNICA vía legítima para crear el envoltorio desde cero.
// 'unreadable' es un blob que EXISTE pero no se sabe interpretar — JSON
// corrupto, un `formatVersion` distinto del actual (p. ej. tras un rollback
// de versión), o un envoltorio sin `entries` array — y nunca debe
// machacarse, solo abortar la escritura. `entries` en la variante 'ok' va
// SIN FILTRAR por `isGameHistoryEntry`: quien filtra es `loadHistory` (de
// cara a la pantalla), nunca esta lectura (de cara al disco).
type EnvelopeRead =
  | { kind: 'empty' }
  | { kind: 'ok', entries: unknown[] }
  | { kind: 'unreadable' }

// CR-03: separa "leer el envoltorio en crudo" de "leer las entradas
// válidas" (que sigue siendo trabajo de `loadHistory`, más abajo). Nunca
// lanza. `readRaw` devolviendo `undefined` (clave ausente O storage
// inaccesible) es la ÚNICA vía a 'empty' — el `catch` del `JSON.parse`
// devuelve 'unreadable', NUNCA 'empty', para que
// `appendHistoryEntry`/`removeHistoryEntry` aborten la escritura en vez de
// sobrescribir un blob que no han sabido interpretar (T-09-01).
function readEnvelope(): EnvelopeRead {
  const raw = readRaw(HISTORY_KEY)
  if (raw === undefined) return { kind: 'empty' }

  try {
    const parsed = JSON.parse(raw) as Partial<HistoryEnvelope>
    if (parsed.formatVersion !== HISTORY_FORMAT_VERSION) return { kind: 'unreadable' }
    if (!Array.isArray(parsed.entries)) return { kind: 'unreadable' }
    return { kind: 'ok', entries: parsed.entries }
  }
  catch {
    // JSON corrupto: ilegible, NO ausente — ver el contrato de arriba.
    return { kind: 'unreadable' }
  }
}

export function usePersistedSession() {
  function load(gameId: string): PersistedPosition | null {
    const raw = readRaw(storageKey(gameId))
    if (!raw) return null

    try {
      const parsed = JSON.parse(raw)
      return isPersistedPosition(parsed) ? parsed : null
    }
    catch {
      // JSON corrupto (edición manual, cuota parcial, etc.): ausencia de dato.
      return null
    }
  }

  function save(session: EngineSession): void {
    const persisted = toPersistedPosition(session)
    writeRaw(storageKey(session.gameId), JSON.stringify(persisted))
  }

  function clear(gameId: string): void {
    // removeItem (no escribir cadena vacía): la clave desaparece de verdad,
    // no queda como cadena vacía (SETUP-05). D-46: solo borra
    // `storageKey(gameId)`, nunca VOICE_KEY.
    removeRaw(storageKey(gameId))
  }

  function loadVoicePreference(): boolean {
    const raw = readRaw(VOICE_KEY)
    if (raw === undefined) return true
    // Mismo criterio que el serializador booleano de VueUse que sustituye
    // esta lectura: solo la cadena literal "true" es verdadera; cualquier
    // otra cosa se coacciona a booleano antes de pasar por
    // normalizeVoicePreference (que solo hace de guarda para el `false`
    // exacto, D-47).
    return normalizeVoicePreference(raw === 'true')
  }

  function saveVoicePreference(enabled: boolean): void {
    writeRaw(VOICE_KEY, String(enabled))
  }

  // D-13/CR-03: lectura defensiva entrada a entrada, apoyada en
  // `readEnvelope()`. 'empty' y 'unreadable' devuelven `[]` por igual DE
  // CARA A LA PANTALLA — la distinción entre ambos solo le importa a las
  // escrituras (`appendHistoryEntry`/`removeHistoryEntry`, más abajo), que
  // sí deben tratarlos de forma distinta para no destruir un blob ilegible.
  // Tres entradas con una rota devuelven las dos buenas: nunca se tira el
  // array entero por un solo elemento ilegible. Contrato público sin
  // cambios respecto al código previo a CR-03.
  function loadHistory(): GameHistoryEntry[] {
    const read = readEnvelope()
    if (read.kind !== 'ok') return []
    return read.entries.filter(isGameHistoryEntry)
  }

  // D-03: la ÚNICA función de este fichero que no devuelve `void` — es
  // deliberado. El histórico es el único dato de la app que no se puede
  // reconstruir, así que el grupo tiene que enterarse si el dispositivo no
  // dejó escribir (modo privado, cuota). Quien vaya a «homogeneizar» la
  // firma a `void` debe leer D-03 primero. HIST-07: la entrada nueva se
  // antepone, así que el histórico ya queda ordenado de más reciente a más
  // antigua tal como se persiste.
  //
  // CR-03: aborta devolviendo `false` SIN llamar a `writeRaw` cuando
  // `readEnvelope()` devuelve 'unreadable' — nunca se machaca un blob que
  // no se ha sabido interpretar (`formatVersion` desconocido, JSON
  // corrupto). Las entradas previas se conservan EN CRUDO (`read.entries`,
  // sin filtrar por `isGameHistoryEntry`): lo que no pasa la validación se
  // filtra de cara a la PANTALLA (`loadHistory`), NUNCA de cara al DISCO —
  // así una entrada hoy ilegible no se destruye para siempre.
  function appendHistoryEntry(entry: GameHistoryEntry): boolean {
    // CR-01 (ronda 2): el predicado que decide qué se puede LEER
    // (`isGameHistoryEntry`, usado por `loadHistory`) debe decidir también
    // qué se puede ESCRIBIR; una entrada que no vaya a superarlo no se
    // «guarda», se pierde en silencio con un ✓ encima. Tras la Task 1 de
    // este plan (09-12) esta rama es defensa en profundidad inalcanzable
    // desde `record()` — el motor ya no produce una entrada inválida — así
    // que su valor real es impedir que un llamador futuro (la
    // sincronización a Firestore, un import) reintroduzca el hueco por
    // otra puerta. Fase 10: no relajar esta guarda para que un caso nuevo
    // «pase».
    if (!isGameHistoryEntry(entry)) return false

    const read = readEnvelope()
    if (read.kind === 'unreadable') return false

    const previous = read.kind === 'ok' ? read.entries : []
    const envelope = {
      formatVersion: HISTORY_FORMAT_VERSION,
      entries: [entry, ...previous],
    }
    return writeRaw(HISTORY_KEY, JSON.stringify(envelope))
  }

  // Reasignación completa del array (nunca `splice` in situ, disciplina de
  // todo el motor). Devuelve `void`: un borrado que no llega a escribirse
  // deja la entrada visible, un estado observable y recuperable — al
  // contrario que una partida no registrada, que es lo que D-03 protege.
  //
  // CR-03/WR-08: mismo patrón de `readEnvelope()` que `appendHistoryEntry`.
  // Ante 'unreadable' no se escribe nada — nunca se machaca un blob
  // ilegible. Ante 'empty' tampoco — no hay nada que borrar, y crear un
  // envoltorio vacío no aporta. Para 'ok', se opera sobre `read.entries` EN
  // CRUDO eliminando COMO MÁXIMO UN elemento: el primero que sea un objeto
  // no nulo cuya propiedad `id` coincida con el argumento — así una
  // colisión de `id` (WR-08) nunca se lleva dos partidas por delante. El
  // resto de elementos, incluidos los que no pasan `isGameHistoryEntry`,
  // sobreviven en disco tal cual.
  function removeHistoryEntry(id: string): void {
    const read = readEnvelope()
    if (read.kind !== 'ok') return

    let removed = false
    const entries = read.entries.filter((candidate) => {
      if (removed) return true
      const isMatch = candidate !== null && typeof candidate === 'object' && (candidate as { id?: unknown }).id === id
      if (!isMatch) return true
      removed = true
      return false
    })

    const envelope = {
      formatVersion: HISTORY_FORMAT_VERSION,
      entries,
    }
    writeRaw(HISTORY_KEY, JSON.stringify(envelope))
  }

  return { load, save, clear, loadVoicePreference, saveVoicePreference, loadHistory, appendHistoryEntry, removeHistoryEntry }
}
