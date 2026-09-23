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
// CR-01 (ronda 3): esa última frase es cierta para `tga:progress:*` y
// `tga:voice-enabled` — datos RECONSTRUIBLES, donde "no sé leer" y "no hay
// dato" pueden colapsarse sin pérdida — pero es FALSA a propósito para
// `tga:history` (irreconstruible, D-13): ahí un fallo de LECTURA nunca
// autoriza a tratar el histórico como ausente. Ver `readRaw`/`readEnvelope`
// más abajo, donde esta distinción se hace explícita en el tipo.
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
// REGLA (IN-12, quick 260923-3rl): todo cambio de FORMA de `GameHistoryEntry`
// que una build ANTERIOR rechazaría (un campo nuevo obligatorio, un tipo que
// se endurece, un valor de enum que se retira) DEBE subir esta constante.
// Desde IN-12, `appendHistoryEntry` descarta del disco las entradas
// previas que `isGameHistoryEntry` rechaza — el envoltorio de
// `formatVersion` desconocido es lo ÚNICO que impide que una build antigua
// (rollback tras un despliegue problemático) trate como basura, en su
// siguiente registro, las entradas que escribió una build más nueva con una
// forma que la antigua no reconoce. Sin subir la versión ante un cambio de
// forma, un rollback destruiría en silencio partidas que el grupo sí puede
// leer con la versión anterior del código.
const HISTORY_FORMAT_VERSION = 1

// IN-04 (09-REVIEW.md, cerrado en la quick 260923-3rl): tope de entradas que
// `appendHistoryEntry` conserva en cada registro con éxito. Constante
// PRIMITIVA (no estado de módulo mutable — no entra en el perímetro que
// audita `invariantesDeMarcaDeEstado.test.ts`). 500 partidas son años al
// ritmo de un grupo de amigos (decenas al año, comentario de D-08 en
// `useHistorySync.ts`), y `record()` (`useGameHistory.ts`) lanza `flush()`
// justo después de cada registro con éxito, así que casi toda la ventana ya
// tiene ocasión de subirse antes de acercarse al tope. Coste aceptado
// (T-3rl-03 del threat model de este plan): una entrada que salga por el
// tope sin haberse subido nunca se pierde también del respaldo — riesgo
// evaluado y aceptado, no una garantía nueva.
export const HISTORY_MAX_ENTRIES = 500

// D-01 (Fase 10): la marca de sincronizado con Firestore vive en su PROPIA
// clave, aparte de `HISTORY_KEY` — nunca como campo dentro de la entrada.
// El motivo es el camino de escritura que CR-01/CR-03 (Fase 9) blindaron:
// `appendHistoryEntry`/`removeHistoryEntry` reescriben el envoltorio ENTERO
// de `tga:history` en cada operación y abortan sin tocar nada si el blob
// resulta ilegible. Un ACK de Firestore llega en un momento arbitrario —
// perfectamente, mientras el grupo borra una entrada en `/historico` — y con
// la marca DENTRO de la entrada, cada ACK obligaría a releer y reescribir
// ese envoltorio, justo el escenario contra el que esos cierres existen. Con
// la clave aparte, el camino de red NUNCA escribe en `tga:history`.
//
// A diferencia de `HISTORY_KEY`, esta clave es RECONSTRUIBLE (D-01): a lo
// sumo se resube algo que el servidor ya tenía, y D-03 (reglas solo-`create`
// en el plan 10-02) hace ese reintento inocuo — se rechaza con
// `permission-denied` y la entrada queda pendiente para siempre, sin que
// eso rompa nada. Por eso el lector de abajo colapsa `unreadable` y `absent`
// como hace `loadVoicePreference`, al contrario que `readEnvelope`.
const SYNCED_KEY = 'tga:history:synced'

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

// CR-01 (ronda 3): resultado discriminado de tres vías para distinguir «no
// hay dato» de «no he podido comprobar si hay dato». Antes de este cierre
// `readRaw` colapsaba las tres situaciones (clave ausente, SSR sin `window`,
// `getItem` lanzando) en un único `undefined`, y `readEnvelope` traducía ese
// `undefined` a `{ kind: 'empty' }` — el mismo camino exacto que una clave
// genuinamente ausente. Eso permitía que un fallo TRANSITORIO de lectura
// (modo privado, cuota, contexto restringido) autorizara a
// `appendHistoryEntry` a reconstruir el envoltorio del histórico desde cero,
// destruyendo partidas ya registradas. Solo `'absent'` significa «el storage
// ha confirmado que la clave no existe»; `'unreadable'` significa «no sé qué
// hay», y quien decide qué hacer con eso es cada llamador según si su dato es
// reconstruible (`load`/`loadVoicePreference`, que siguen colapsando ambos) o
// no (`readEnvelope`, que ya no lo hace).
type RawRead =
  | { kind: 'absent' }
  | { kind: 'value', raw: string }
  | { kind: 'unreadable' }

// Los cuatro ayudantes siguientes son el único punto que toca
// `window.localStorage` de verdad.
function readRaw(key: string): RawRead {
  // Sin `window` (SSR/prerender) tampoco se escribe (`writeRaw` ya devuelve
  // `false` sin `window`), así que clasificarlo como «ilegible» es
  // literalmente cierto y además es la clasificación segura — nunca autoriza
  // a machacar un dato que pudiera existir en el dispositivo real.
  if (typeof window === 'undefined') return { kind: 'unreadable' }
  try {
    const value = window.localStorage.getItem(key)
    if (value === null) return { kind: 'absent' }
    return { kind: 'value', raw: value }
  }
  catch {
    return { kind: 'unreadable' }
  }
}

// D-03 (Fase 9): devuelve si la escritura llegó a completarse. Se propaga
// directamente el resultado del `try` interno — se descarta a propósito
// comparar `readRaw` antes/después (produciría un falso negativo si el
// contenido escrito coincidiera con el anterior, y obliga a una lectura y
// un parseo de más).
//
// Quién MIRA el resultado — ahora son TRES, no dos:
// - `appendHistoryEntry` — el histórico es el único dato de la app que no se
//   puede reconstruir, así que el grupo tiene que enterarse si el
//   dispositivo no dejó escribir.
// - `save` — desde 09-16 el progreso dejó de ser un dato meramente
//   reconstruible en el camino del registro fallido: pasó a ser la red de
//   seguridad explícita del reintento, y la interfaz lo declara por escrito
//   al usuario (`HistorySavedNotice.vue`). Un dato del que la app hace una
//   promesa no puede escribirse con un fallo silencioso (CR-01 ronda 4,
//   `09-VERIFICATION.md`).
// - `removeHistoryEntry` (IN-11, quick 260923-3rl): antes de este cierre, un
//   borrado que no llegaba a escribirse dejaba la tarjeta visible en
//   `/historico` tras el `reload()` sin que nada se lo explicara al grupo —
//   parecía que el botón de borrar no funcionaba. Ahora `/historico` mira el
//   resultado y pinta un aviso en línea cuando es `false`.
//
// Quién sigue IGNORÁNDOLO, y que eso es deliberado: `saveVoicePreference`
// sigue con firma `void`, y los dos llamadores del autoguardado de la
// partida (el `watchDebounced` y el `pagehide` de
// `app/pages/[game]/index.vue`) siguen llamando a `save()` sin mirar lo que
// devuelve — VOZ-06/D-51 exigen que un fallo de almacenamiento nunca rompa
// next()/prev()/toggle(), y eso sigue intacto.
//
// La regla en una frase: devolver el booleano no obliga a consumirlo; lo
// que ya no se permite es AFIRMARLE algo al grupo sobre ese dato sin
// haberlo mirado.
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
// SIN FILTRAR por `isGameHistoryEntry`: esta lectura nunca decide qué
// sobrevive, solo entrega lo que hay en crudo — cada función que la use
// decide por su cuenta (IN-12, quick 260923-3rl): `loadHistory` filtra de
// cara a la PANTALLA, `appendHistoryEntry` filtra de cara al REGISTRO (deja
// de escribir lo que `isGameHistoryEntry` rechaza), y `removeHistoryEntry`
// no filtra en absoluto — conserva en disco tal cual lo que no reconoce
// (WR-08/CR-03), un borrado sigue siendo conservador con lo que no entiende.
//
// WR-02 (quick 260923-3rm): la variante `'unreadable'` gana `reason` — un
// `getItem` que lanza (`'read-failed'`) y un blob que existe pero no se sabe
// interpretar (`'uninterpretable'`, JSON corrupto/`formatVersion` desconocido/
// `entries` no array) eran indistinguibles hasta este quick, y
// `archiveUnreadableHistory` (más abajo) SOLO tiene permiso para archivar la
// segunda variante — un `getItem` que lanza no tiene ningún blob que copiar
// de verdad.
type EnvelopeRead =
  | { kind: 'empty' }
  | { kind: 'ok', entries: unknown[] }
  | { kind: 'unreadable', reason: 'read-failed' | 'uninterpretable' }

// interpretHistoryRaw (WR-02, quick 260923-3rm): la interpretación del blob
// (JSON → `formatVersion` → `entries`) extraída a una función interna
// ÚNICA, para que `readEnvelope` (usada por `appendHistoryEntry`/
// `removeHistoryEntry`) y `archiveUnreadableHistory` (más abajo) NUNCA
// puedan divergir sobre qué cuenta como ilegible. Nunca lanza. `'empty'`
// tiene una sola fuente: `read.kind === 'absent'` — la clave no existe de
// verdad, confirmado por `getItem` devolviendo `null` sin lanzar. Si alguien
// vuelve a colapsar «no he podido leer» y «no hay nada» en un mismo camino,
// vuelve a abrir el BLOCKER CR-01 (ronda 3).
function interpretHistoryRaw(read: RawRead): EnvelopeRead {
  if (read.kind === 'unreadable') return { kind: 'unreadable', reason: 'read-failed' }
  if (read.kind === 'absent') return { kind: 'empty' }

  try {
    const parsed = JSON.parse(read.raw) as Partial<HistoryEnvelope>
    if (parsed.formatVersion !== HISTORY_FORMAT_VERSION) return { kind: 'unreadable', reason: 'uninterpretable' }
    if (!Array.isArray(parsed.entries)) return { kind: 'unreadable', reason: 'uninterpretable' }
    return { kind: 'ok', entries: parsed.entries }
  }
  catch {
    // JSON corrupto: ilegible, NO ausente — ver el contrato de arriba.
    return { kind: 'unreadable', reason: 'uninterpretable' }
  }
}

// CR-03/CR-01 (ronda 3): separa "leer el envoltorio en crudo" de "leer las
// entradas válidas" (que sigue siendo trabajo de `loadHistory`, más abajo).
// Ya no interpreta el blob por su cuenta (WR-02, quick 260923-3rm): delega
// en `interpretHistoryRaw`, la única función con permiso para decidir qué
// es ilegible y por qué. Esa variante ya aborta toda escritura en
// `appendHistoryEntry`/`removeHistoryEntry` sin tocar `writeRaw` (T-09-01).
function readEnvelope(): EnvelopeRead {
  return interpretHistoryRaw(readRaw(HISTORY_KEY))
}

// CR-01 (ronda 5): resultado discriminado de LEER el progreso, distinto del
// booleano de ESCRITURA que ya devuelve `save`. Responden a preguntas
// distintas — `save` contesta «¿ha funcionado ESTA escritura?»; `ProgressRead`
// contesta «¿qué hay ahora mismo en el dispositivo?» — y confundirlas es
// exactamente el BLOCKER de la ronda 5 (`09-VERIFICATION.md`): un booleano de
// escritura acabó respaldando una frase sobre lo que queda guardado.
//
// `{ read: 'ok', position: null }` significa «he mirado el dispositivo y ahí
// no hay ninguna posición utilizable» (clave ausente, JSON corrupto, o forma
// que `isPersistedPosition` rechaza — las tres son una lectura CORRECTA cuyo
// resultado es «nada que ofrecer»). `{ read: 'failed' }` significa «no he
// podido mirar, así que no sé qué hay» (`getItem` lanzando, o sin `window`) —
// mismo precedente que CR-01 ronda 3 ya fijó para `tga:history` en
// `readEnvelope`/`EnvelopeRead`, aplicado ahora también al progreso.
//
// Regla que hay que seguir: quien vaya a AFIRMARLE algo al grupo sobre su
// progreso guardado usa `readProgress`; quien solo quiera una posición con la
// que arrancar (sin necesidad de distinguir el porqué de un `null`) usa
// `load`.
export type ProgressRead =
  | { read: 'ok', position: PersistedPosition | null }
  | { read: 'failed' }

// WR-01 (Fase 10, revisión de código): mismo criterio discriminado que
// `ProgressRead` de arriba, aplicado ahora a `tga:history`. `{ kind: 'ok',
// entries }` cubre tanto el envoltorio genuinamente vacío como el que trae
// entradas — de cara a este discriminante ambos son «he podido leer, y esto
// es lo que hay». Solo `'unreadable'` significa «no sé qué hay» (JSON
// corrupto, `formatVersion` desconocido, o un `getItem` que lanza). Existe
// para que un llamador que NO pueda permitirse colapsar ambos casos (la poda
// perezosa de D-04 en `useHistorySync.ts`) tenga de dónde tirar sin duplicar
// la lectura de `readEnvelope()` ni cambiar lo que devuelve `loadHistory`.
export type HistoryRead =
  | { kind: 'ok', entries: GameHistoryEntry[] }
  | { kind: 'unreadable' }

// HistoryState (WR-02, quick 260923-3rm): mismo criterio discriminado que
// `HistoryRead`, pero SIN colapsar los dos motivos de ilegibilidad — es la
// distinción que `/historico` necesita para ofrecer una salida (archivar)
// solo cuando de verdad hay un blob que archivar (`'uninterpretable'`), y
// para explicar por qué no hay salida cuando la lectura en sí ha fallado
// (`'read-failed'`, p. ej. modo privado del navegador). `readHistory` (el
// contrato existente de `useHistorySync.ts`) sigue colapsando los dos casos
// en `'unreadable'` — este tipo es aditivo, no lo sustituye.
export type HistoryState =
  | { kind: 'ok', entries: GameHistoryEntry[] }
  | { kind: 'read-failed' }
  | { kind: 'uninterpretable' }

export function usePersistedSession() {
  // CR-01 (ronda 5): única ruta de parseo del progreso — `load` (más abajo)
  // es un envoltorio suyo, así que las dos no pueden divergir nunca.
  function readProgress(gameId: string): ProgressRead {
    const read = readRaw(storageKey(gameId))
    if (read.kind === 'unreadable') return { read: 'failed' }
    if (read.kind === 'absent') return { read: 'ok', position: null }

    try {
      const parsed = JSON.parse(read.raw)
      // JSON válido pero de forma inservible (`isPersistedPosition` la
      // rechaza): el dispositivo SÍ ha contestado, lo que contesta no sirve
      // — sigue siendo `read: 'ok'`, nunca `'failed'`.
      return { read: 'ok', position: isPersistedPosition(parsed) ? parsed : null }
    }
    catch {
      // JSON corrupto: lectura correcta, contenido inservible — no ausencia
      // de LECTURA, ausencia de POSICIÓN utilizable.
      return { read: 'ok', position: null }
    }
  }

  function load(gameId: string): PersistedPosition | null {
    // CR-01 (ronda 3): el progreso es un dato RECONSTRUIBLE (se vuelve a
    // jugar desde el paso que sea), así que tratar «no sé leer» igual que «no
    // hay partida guardada» no destruye nada — es justo la propiedad que el
    // histórico no tiene. Desde la ronda 5 esta colapsación es explícita y
    // LOCAL a `load`: existe una sola ruta de parseo (`readProgress`), así que
    // `load` y `readProgress` no pueden divergir jamás.
    const lectura = readProgress(gameId)
    return lectura.read === 'ok' ? lectura.position : null
  }

  // CR-01 (ronda 4): devuelve si `window.localStorage.setItem` completó sin
  // lanzar para `tga:progress:<gameId>` con el contenido de ESTA sesión — eso
  // es lo ÚNICO que afirma: no afirma que el dato siga ahí más tarde, ni que
  // sea legible después. `false` significa «no se pudo escribir»: sin
  // `window` (SSR/prerender), o `setItem` lanzando (modo privado del
  // navegador, cuota agotada).
  //
  // Devolver el booleano NO OBLIGA A NADIE A MIRARLO: los dos llamadores del
  // autoguardado (`watchDebounced` y `pagehide` en `app/pages/[game]/index.vue`)
  // lo siguen ignorando, y eso es exactamente lo que VOZ-06/D-51 exigen — un
  // fallo de almacenamiento no puede romper next()/prev()/toggle(). Lo que
  // cambia es que ahora EXISTE el dato para quien sí lo necesite (planes
  // 09-20/09-21). Motivo: BLOCKER CR-01 ronda 4 de `09-VERIFICATION.md` —
  // desde 09-16 la interfaz afirma por escrito al grupo algo sobre
  // `tga:progress:<gameId>`, y ninguna afirmación de la interfaz sobre los
  // datos del grupo puede carecer de un valor de retorno real que la respalde.
  function save(session: EngineSession): boolean {
    const persisted = toPersistedPosition(session)
    return writeRaw(storageKey(session.gameId), JSON.stringify(persisted))
  }

  function clear(gameId: string): void {
    // removeItem (no escribir cadena vacía): la clave desaparece de verdad,
    // no queda como cadena vacía (SETUP-05). D-46: solo borra
    // `storageKey(gameId)`, nunca VOICE_KEY.
    removeRaw(storageKey(gameId))
  }

  function loadVoicePreference(): boolean {
    const read = readRaw(VOICE_KEY)
    // CR-01 (ronda 3): preferencia RECONSTRUIBLE (se vuelve a pulsar el
    // botón), así que «no sé leer» sigue cayendo al valor por defecto igual
    // que «no hay preferencia guardada» — mismo criterio que `load` arriba.
    if (read.kind !== 'value') return true
    // Mismo criterio que el serializador booleano de VueUse que sustituye
    // esta lectura: solo la cadena literal "true" es verdadera; cualquier
    // otra cosa se coacciona a booleano antes de pasar por
    // normalizeVoicePreference (que solo hace de guarda para el `false`
    // exacto, D-47).
    return normalizeVoicePreference(read.raw === 'true')
  }

  function saveVoicePreference(enabled: boolean): void {
    writeRaw(VOICE_KEY, String(enabled))
  }

  // D-01/D-04 (Fase 10): lista de ids de entradas del histórico ya subidas a
  // Firestore. Mismo idioma COLAPSABLE que `loadVoicePreference` — la clave
  // es reconstruible (ver comentario de `SYNCED_KEY` arriba), así que
  // «no sé leer» y «no hay marca guardada» caen los dos al mismo valor por
  // defecto ([]): todo se trata como pendiente, y D-03 hace ese reintento
  // inocuo. Un `JSON.parse` que falle, o que no dé un array de cadenas,
  // también devuelve [] — nunca lanza.
  function loadSyncedIds(): string[] {
    const read = readRaw(SYNCED_KEY)
    if (read.kind !== 'value') return []
    try {
      const parsed: unknown = JSON.parse(read.raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter((id): id is string => typeof id === 'string')
    }
    catch {
      return []
    }
  }

  // Firma `void`, igual que `saveVoicePreference`: un fallo aquí solo
  // produce un reintento de más en el próximo flush (D-03 lo hace inocuo),
  // así que no hay nada útil que el llamador pudiera hacer con el booleano
  // de `writeRaw`.
  function saveSyncedIds(ids: string[]): void {
    writeRaw(SYNCED_KEY, JSON.stringify(ids))
  }

  // D-13/CR-03: lectura defensiva entrada a entrada, apoyada en
  // `readEnvelope()`. 'empty' y 'unreadable' devuelven `[]` por igual DE
  // CARA A LA PANTALLA — la distinción entre ambos solo le importa a las
  // escrituras (`appendHistoryEntry`/`removeHistoryEntry`, más abajo), que
  // sí deben tratarlos de forma distinta para no destruir un blob ilegible.
  // Tres entradas con una rota devuelven las dos buenas: nunca se tira el
  // array entero por un solo elemento ilegible. Contrato público sin
  // cambios respecto al código previo a CR-03.
  // WR-01/D-04 (Fase 10): variante de `loadHistory` que SÍ distingue
  // `'unreadable'` de `'ok'` — mismo precedente que `readProgress`/`ProgressRead`
  // ya fija para el progreso, ahora aplicado al histórico. `loadHistory` (más
  // abajo) sigue colapsando los dos casos de cara a la pantalla (contrato sin
  // cambios); este lector es para quien SÍ necesite decidir algo distinto
  // ante un fallo transitorio de lectura — la poda perezosa de D-04 en
  // `useHistorySync.ts`, que antes de este cierre podaba `tga:history:synced`
  // hasta vaciarla del todo cuando `readEnvelope()` devolvía `'unreadable'`
  // justo en ese instante (WR-01).
  // readHistoryState (WR-02, quick 260923-3rm): envuelve `readEnvelope()`
  // filtrando las entradas por `isGameHistoryEntry` (igual que `readHistory`
  // hacía) pero SIN colapsar los dos motivos de ilegibilidad — es la
  // autoridad que `/historico`/`/estadisticas` consultan para decidir qué
  // explicar y si ofrecer la acción de archivado.
  function readHistoryState(): HistoryState {
    const read = readEnvelope()
    if (read.kind === 'unreadable') {
      return read.reason === 'read-failed' ? { kind: 'read-failed' } : { kind: 'uninterpretable' }
    }
    const entries = read.kind === 'ok' ? read.entries.filter(isGameHistoryEntry) : []
    return { kind: 'ok', entries }
  }

  // readHistory (contrato SIN CAMBIOS de `useHistorySync.ts`, `HistoryRead`):
  // reescrito como envoltorio de `readHistoryState()` que colapsa
  // `'read-failed'`/`'uninterpretable'` en `'unreadable'` — mismo resultado
  // observable de siempre, una sola ruta de interpretación por debajo.
  function readHistory(): HistoryRead {
    const state = readHistoryState()
    if (state.kind !== 'ok') return { kind: 'unreadable' }
    return { kind: 'ok', entries: state.entries }
  }

  function loadHistory(): GameHistoryEntry[] {
    const read = readHistory()
    return read.kind === 'ok' ? read.entries : []
  }

  // archiveUnreadableHistory (WR-02, quick 260923-3rm): la salida explícita
  // que faltaba para un `tga:history` `'uninterpretable'` permanente — sin
  // ella, `appendHistoryEntry`/`loadHistory` quedaban bloqueados PARA
  // SIEMPRE (CR-03 los hace conservadores a propósito) y no existía ninguna
  // acción en la interfaz para salir del callejón.
  //
  // Solo actúa cuando `interpretHistoryRaw` dice `'uninterpretable'` sobre
  // el blob EN CRUDO releído en este instante — nunca sobre `'read-failed'`
  // (no hay ningún blob que copiar de verdad: `getItem` ni siquiera ha
  // podido contestar) ni sobre un envoltorio legible o una clave ausente
  // (nada que archivar). La copia se escribe en `tga:history:backup-<now>`
  // y se RELEE para comparar BYTE A BYTE contra el original antes de retirar
  // nada — CR-03: nunca destruir lo que no se ha sabido interpretar sin
  // haber verificado antes que la copia es exacta. Solo entonces se llama a
  // `removeRaw`, y solo se devuelve `'archived'` si una relectura FINAL
  // confirma que la clave ha quedado ausente de verdad. Nunca escribe
  // `tga:history` ni toca `tga:history:synced` (D-04 de `useHistorySync.ts`
  // sigue intacto: la siguiente partida crea el envoltorio por la vía
  // legítima `'empty'` de `appendHistoryEntry`, y D-03 hace inocuo cualquier
  // reintento de subida futura de lo que ya se archivó).
  function archiveUnreadableHistory(now: number): 'archived' | 'not-needed' | 'failed' {
    const raw = readRaw(HISTORY_KEY)
    if (raw.kind === 'unreadable') return 'failed'
    if (raw.kind === 'absent') return 'not-needed'

    const interpreted = interpretHistoryRaw(raw)
    if (interpreted.kind !== 'unreadable' || interpreted.reason !== 'uninterpretable') return 'not-needed'

    const backupKey = `${HISTORY_KEY}:backup-${now}`
    if (!writeRaw(backupKey, raw.raw)) return 'failed'

    // Verificación byte a byte de la copia ANTES de retirar nada (CR-03).
    const verify = readRaw(backupKey)
    if (verify.kind !== 'value' || verify.raw !== raw.raw) return 'failed'

    removeRaw(HISTORY_KEY)

    // Relectura FINAL: solo 'archived' si la clave ha quedado confirmada
    // ausente — un `removeItem` que fallase en silencio dejaría el blob
    // ilegible en su sitio pese a que la copia sí se escribió.
    const confirmRemoved = readRaw(HISTORY_KEY)
    if (confirmRemoved.kind !== 'absent') return 'failed'

    return 'archived'
  }

  // No es `void`: el histórico es el único dato de la app que no se puede
  // reconstruir, así que el grupo tiene que enterarse si el dispositivo no
  // dejó escribir (modo privado, cuota). Ya no es la única de este fichero
  // con ese contrato — `save` (arriba) y, desde IN-11 (quick 260923-3rl),
  // `removeHistoryEntry` (más abajo) también devuelven `boolean` por el
  // mismo motivo. HIST-07: la entrada nueva se antepone, así que el
  // histórico ya queda ordenado de más reciente a más antigua tal como se
  // persiste.
  //
  // CR-03: aborta devolviendo `false` SIN llamar a `writeRaw` cuando
  // `readEnvelope()` devuelve 'unreadable' — nunca se machaca un blob que
  // no se ha sabido interpretar (`formatVersion` desconocido, JSON
  // corrupto). Esto no cambia con IN-12: un envoltorio ilegible sigue sin
  // tocarse, sea cual sea el contenido de sus entradas.
  //
  // IN-04/IN-12 (09-REVIEW.md, cerrado en la quick 260923-3rl): hasta este
  // cierre, las entradas previas se conservaban EN CRUDO (`read.entries` sin
  // filtrar) y sin ningún tope — lo que no pasaba `isGameHistoryEntry` se
  // filtraba solo de cara a la PANTALLA (`loadHistory`), nunca de cara al
  // DISCO, y el envoltorio crecía sin límite. Los dos motivos por los que
  // eso era deuda real: una entrada que `isGameHistoryEntry` rechaza es
  // invisible (`loadHistory` la filtra antes de pintar) y no se puede borrar
  // (no hay tarjeta con su `id` para invocar `removeHistoryEntry`) — ocupa
  // cuota para siempre (IN-12); y sin tope, el día que el histórico agote la
  // cuota de `localStorage` el síntoma es un aviso de fallo sin ninguna
  // explicación adicional (IN-04). Este cierre invierte la conservación EN
  // CRUDO para el REGISTRO — el único punto de mantenimiento, porque ocurre
  // una vez por partida — y `removeHistoryEntry` (más abajo) sigue siendo
  // TAN CONSERVADOR COMO ANTES con lo que no reconoce: el endurecimiento no
  // se propaga al borrado (el test CR-03 que lo fija no se toca).
  //
  // No lee ni escribe la marca de sincronizado con Firestore (clave aparte,
  // ver su comentario más arriba): la poda de esa marca es de
  // `useHistorySync.ts` (decisión 10-03, D-04), y su lector (`readHistory`,
  // usado por `syncPending`) ya retira en el siguiente flush cualquier id
  // que no esté en el histórico — un id que el tope acaba de podar aquí no
  // puede volver a subirse, porque las pendientes se calculan siempre desde
  // `loadHistory()`.
  function appendHistoryEntry(entry: GameHistoryEntry): boolean {
    // CR-01 (ronda 2): el predicado que decide qué se puede LEER
    // (`isGameHistoryEntry`, usado por `loadHistory`) debe decidir también
    // qué se puede ESCRIBIR; una entrada que no vaya a superarlo no se
    // «guarda», se pierde en silencio con un ✓ encima. Tras la Task 1 de
    // este plan (09-12) esta rama es defensa en profundidad inalcanzable
    // desde `record()` — el motor ya no produce una entrada inválida — así
    // que su valor real es impedir que un llamador futuro (un respaldo
    // remoto, un import) reintroduzca el hueco por otra puerta. Próximas
    // fases: no relajar esta guarda para que un caso nuevo «pase».
    if (!isGameHistoryEntry(entry)) return false

    const read = readEnvelope()
    if (read.kind === 'unreadable') return false

    // IN-12: las previas se filtran por `isGameHistoryEntry` ANTES de
    // anteponer la nueva — el mismo predicado que decide qué se puede LEER
    // decide ahora también qué sobrevive al siguiente registro. IN-04: el
    // resultado se corta a los primeros `HISTORY_MAX_ENTRIES` — como cada
    // registro antepone (más reciente primero), lo que sale por el tope es
    // siempre lo más antiguo.
    const previous = read.kind === 'ok' ? read.entries.filter(isGameHistoryEntry) : []
    const envelope = {
      formatVersion: HISTORY_FORMAT_VERSION,
      entries: [entry, ...previous].slice(0, HISTORY_MAX_ENTRIES),
    }
    return writeRaw(HISTORY_KEY, JSON.stringify(envelope))
  }

  // Reasignación completa del array (nunca `splice` in situ, disciplina de
  // todo el motor). IN-11 (09-REVIEW.md, cerrado en la quick 260923-3rl):
  // devuelve `boolean` — antes devolvía `void`, y un borrado que no llegaba
  // a escribirse dejaba la tarjeta visible tras `reload()` sin que nada se
  // lo explicara al grupo, que creía que el botón de borrar no funcionaba.
  // `true` significa «no queda nada pendiente de borrar: o se borró de
  // verdad, o no había nada que borrar y nada ha fallado». `false` significa
  // «había algo que mirar y no se ha podido actuar sobre ello» — un
  // envoltorio ilegible (CR-03) o un `setItem` que lanza.
  //
  // CR-03/WR-08: mismo patrón de `readEnvelope()` que `appendHistoryEntry`.
  // Ante 'unreadable' no se escribe nada — nunca se machaca un blob
  // ilegible — y se devuelve `false`. Ante 'empty' tampoco se escribe — no
  // hay nada que borrar, y crear un envoltorio vacío no aporta — pero se
  // devuelve `true`: no hay ningún fallo que reportar. Para 'ok', se opera
  // sobre `read.entries` EN CRUDO eliminando COMO MÁXIMO UN elemento: el
  // primero que sea un objeto no nulo cuya propiedad `id` coincida con el
  // argumento — así una colisión de `id` (WR-08) nunca se lleva dos
  // partidas por delante. El resto de elementos, incluidos los que no pasan
  // `isGameHistoryEntry`, sobreviven en disco tal cual — IN-12 solo
  // endurece `appendHistoryEntry` (más abajo), nunca este camino: un
  // borrado sigue siendo conservador con lo que no reconoce. Sin
  // coincidencia, devuelve `true` sin escribir. Con coincidencia, devuelve
  // lo que devuelva `writeRaw`.
  function removeHistoryEntry(id: string): boolean {
    const read = readEnvelope()
    if (read.kind === 'unreadable') return false
    if (read.kind === 'empty') return true

    let removed = false
    const entries = read.entries.filter((candidate) => {
      if (removed) return true
      const isMatch = candidate !== null && typeof candidate === 'object' && (candidate as { id?: unknown }).id === id
      if (!isMatch) return true
      removed = true
      return false
    })

    if (!removed) return true

    const envelope = {
      formatVersion: HISTORY_FORMAT_VERSION,
      entries,
    }
    return writeRaw(HISTORY_KEY, JSON.stringify(envelope))
  }

  // backupProgressBeforeOverwrite (WR-02 ronda 6, quick 260923-3rm): copia
  // el crudo de `tga:progress:<gameId>` a `tga:progress:<gameId>:backup-<now>`
  // ANTES de que el primer autoguardado de una partida nueva pueda
  // sobrescribirlo. `true` cuando no hay nada que copiar (clave ausente —
  // nada que perder) o cuando la copia se ha verificado byte a byte; `false`
  // ante cualquier fallo (lectura caída, escritura del backup caída, o la
  // relectura de verificación no coincide) — y en NINGÚN caso escribe la
  // clave principal `tga:progress:<gameId>`, sea cual sea el resultado.
  function backupProgressBeforeOverwrite(gameId: string, now: number): boolean {
    const key = storageKey(gameId)
    const raw = readRaw(key)
    if (raw.kind === 'unreadable') return false
    if (raw.kind === 'absent') return true

    const backupKey = `${key}:backup-${now}`
    if (!writeRaw(backupKey, raw.raw)) return false

    const verify = readRaw(backupKey)
    if (verify.kind !== 'value' || verify.raw !== raw.raw) return false

    return true
  }

  // createOverwriteGuard (WR-02 ronda 6, quick 260923-3rm): el guardián de
  // escritura que cierra el hueco de la ronda 6 — tras una lectura fallida
  // del progreso al montar, el primer autoguardado de la partida nueva ya
  // no sobrescribe sin más lo que no se pudo leer.
  //
  // El flag `armed` vive en un CIERRE dentro de esta función, nunca a
  // columna 0 de módulo (el gate de invariantes de
  // `invariantesDeMarcaDeEstado.test.ts` solo audita
  // `useHistorySavedNotice.ts`/`useProgressMismatchMark.ts` para ese patrón
  // — este composable no puede sumarse a esa lista).
  //
  // Sin armar, `save` delega directamente en el `save` de siempre — el
  // guardián solo actúa cuando `arm()` lo ha activado explícitamente
  // (`app/pages/[game]/index.vue` lo arma únicamente cuando
  // `planProgressMount` devolvió un aviso de lectura no verificada).
  //
  // Armado, la PRIMERA `save` intenta `backupProgressBeforeOverwrite` con el
  // `clock()` inyectado (real: `Date.now()`, determinista en test): si
  // devuelve `false` (la clave sigue sin poder leerse, o el backup no se
  // pudo escribir/verificar), `save` devuelve `false` SIN escribir la clave
  // principal y SIGUE armado — el guardián no se rinde con un solo intento,
  // vuelve a intentarlo en el siguiente autoguardado. Si devuelve `true`, el
  // guardián se DESARMA y delega en el `save` de siempre — ya no hace falta
  // proteger nada más: el guardián ya no depende del supuesto no verificado
  // de que lectura y escritura fallan juntas (deferred-items.md) — si no se
  // puede leer, no se escribe encima, punto.
  function createOverwriteGuard(clock: () => number = () => Date.now()) {
    let armed = false

    function guardedSave(session: EngineSession): boolean {
      if (!armed) return save(session)

      const backedUp = backupProgressBeforeOverwrite(session.gameId, clock())
      if (!backedUp) return false

      armed = false
      return save(session)
    }

    return {
      arm: () => { armed = true },
      isArmed: () => armed,
      save: guardedSave,
    }
  }

  return { load, readProgress, save, clear, loadVoicePreference, saveVoicePreference, loadHistory, readHistory, readHistoryState, archiveUnreadableHistory, appendHistoryEntry, removeHistoryEntry, loadSyncedIds, saveSyncedIds, backupProgressBeforeOverwrite, createOverwriteGuard }
}
