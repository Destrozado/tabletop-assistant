// app/composables/__tests__/afirmacionesRespaldadas.test.ts
//
// EL GATE DE CLASE (plan 09-26, cierre del BLOCKER de la ronda 5; reformado
// en el plan 09-30, cierre del Gap #2 de la ronda 6).
//
// Seis rondas de verificación de esta fase han encontrado ocho caras del
// MISMO defecto: una afirmación de la app sobre los datos guardados del
// grupo, sin que una lectura real del dispositivo la respaldara. Cada ronda
// cerró la cara que había encontrado — nunca la clase entera — y la ronda
// siguiente encontraba la cara de al lado. Este fichero es la versión
// EJECUTABLE del criterio de inclusión de `09-AUDIT-AFIRMACIONES-UI.md` §1
// («frase que afirma un hecho sobre los datos persistidos del grupo»), para
// que la novena cara no dependa de que alguien repita el barrido a mano.
//
// El Gap #2 de la ronda 6 (CR-03/WR-04 de `09-REVIEW.md`) es el hallazgo que
// explica mecánicamente por qué el Gap #1 no se detectó solo: el
// `extraerTemplate` original cortaba en el PRIMER `</template>` del fichero
// — el 1,9% de `app/pages/[game]/index.vue` (761 de ~7.090+ caracteres) —
// porque su cuantificador era perezoso y el fichero tiene un `<template
// #fallback>` de `ClientOnly` anidado casi al principio. `ResumePrompt`,
// `ConfirmDialog`, `ContentChangedNotice` y `GameOutcomeDialog` — donde han
// vivido cinco de las ocho caras — quedaban fuera. Y ningún gate miraba
// `<script setup>`, así que `endGameBody` (IN-03/WR-04, abierto desde la
// ronda 4) seguía invisible por partida doble.
//
// La regla nueva, desde el plan 09-30: NO se intenta acotar el bloque de
// nuevo con otro delimitador — acotar el bloque es lo que falló. Se barre el
// FICHERO ENTERO menos lo que no es copy (comentarios y `<style>`), y las
// excepciones se auditan una a una, por frase, con su motivo escrito.
//
// Cuatro gates:
// - Gate A: ningún `.vue` ni `.ts` de `app/` afirma nada por su cuenta en su
//   plantilla o en su `<script setup>` (barrido completo vía
//   `regionVigilada`, no solo el `<template>`, y desde el 09-30 también
//   `app/**/*.ts`). Las excepciones legítimas viven en
//   `AFIRMACIONES_AUDITADAS`, un mapa POR FRASE (no por fichero completo):
//   auditar un fichero ya no exime cualquier frase futura que escriba (T-09-30-06).
// - Gate B: la copy del composable (`NOTICE_BODY`) solo afirma desde
//   variantes que la autoridad puede producir, y esas cuatro variantes
//   (incluida `failure-stale`, plan 09-28) cubren EXACTAMENTE los cuatro
//   valores de `StoredProgress`, sin hueco ni solape.
// - Gate C: nadie fuera de los ficheros que conocen la autoridad se inventa
//   el estado del dispositivo con un literal o una comparación propia; desde
//   el 09-30 también vigila los literales de `NoticeVariant` (WR-03) y
//   normaliza comillas dobles/backticks antes de comparar (IN-05).
// - Gate S: auto-verificación del propio gate (09-30) — el detector se pone
//   rojo con SFC sintéticos si alguien vuelve a acotar la región vigilada.
//
// ALCANCE DECLARADO POR ESCRITO (plan 09-37, Task 3, cierre del tercer
// `missing:` del segundo gap de `09-VERIFICATION.md` ronda 8): estos cuatro
// gates auditan TEXTO (NOTICE_BODY/NOTICE_HEADING/literales de variante)
// contra su RESPALDO, EN EL MOMENTO EN QUE EL TEXTO SE ESCRIBE. NO cubren
// invariantes de ciclo de vida de estado de módulo: una frase que TENÍA
// respaldo y lo pierde por un camino de código que nunca la invalida (la
// novena cara del defecto, CR-01/WR-01 de `09-REVIEW.md`) es
// estructuralmente invisible aquí — ningún gate de este fichero mira los
// puntos de invalidación de una marca. Quien cubre esa clase de defecto es
// `app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts`, con sus
// cinco patas sobre el ciclo de vida de las marcas de estado de módulo.
//
// Recorrido de ficheros vía `import.meta.glob` (macro de Vite/Vitest), NO
// `node:fs`/`node:url`: este fichero vive bajo `app/composables/__tests__/`,
// que SÍ pasa por `npm run typecheck` (09-24), y ese árbol no tiene
// `@types/node` instalado — mismo motivo, mismo patrón de sustitución, que
// ya documentó el plan 09-25 (ver su SUMMARY, «Deviations from Plan») para
// el import del fixture JSON. `import.meta.glob` sí tiene tipos disponibles
// aquí (los aporta `vite/client`, ya referenciado por `nuxt/app`), y
// funciona igual bajo Vitest (que transforma con Vite) sin depender de
// ningún módulo de Node.
import { beforeAll, describe, expect, it } from 'vitest'
import { NOTICE_BODY, NOTICE_HEADING, resolveNoticeVariant } from '../useHistorySavedNotice'
import type { StoredProgress } from '../useStoredProgress'
// Vocabulario compartido (plan 09-37, cierre de T-09-37-02): las raíces
// léxicas, la región vigilada, el descubrimiento de ficheros del árbol y
// `respaldoExiste` se MUEVEN a `vocabularioDeAfirmaciones.ts` para que el
// gate nuevo de este plan (`invariantesDeMarcaDeEstado.test.ts`) los
// comparta sin copiarlos — dos copias que pudieran divergir en silencio
// serían una cara nueva del mismo defecto que este fichero lleva nueve
// rondas cerrando.
import {
  RAICES_SOBRE_LOS_DATOS_DEL_GRUPO,
  contieneRaizSobreLosDatosDelGrupo,
  ficherosTsDelArbol,
  ficherosVueDelArbol,
  identificadoresComprobablesDe,
  motivoNombraAlgoComprobable,
  normalizarEspacios,
  quitarComentarios,
  regionVigilada,
  respaldoExiste,
  respaldoRespaldaA,
  rutaRelativa,
} from './vocabularioDeAfirmaciones'

// Los cuatro valores de `StoredProgress`, escritos como constante del test —
// nunca se inventa un quinto ni se deduce de otro sitio. `'stale'` (plan
// 09-28, séptima cara del defecto) se añade aquí en el 09-30: antes de este
// plan Gate B solo conocía los tres valores originales y `'failure-stale'`
// pasaba desapercibido en el barrido de NOTICE_BODY.
const TODOS_LOS_ESTADOS_DEL_DISPOSITIVO: StoredProgress[] = ['resumable', 'stale', 'absent', 'unknown']

// VOCABULARIO_CERRADO_HASTA_LA_RONDA_7 (plan 09-34): las 11 subcadenas
// exactas que fueron el criterio ÚNICO hasta este plan, conservadas ahora
// solo como constante de COMPROBACIÓN — no como criterio — para que el test
// de subsunción de más abajo demuestre mecánicamente que el criterio nuevo
// no pierde nada del viejo. Copiadas literalmente del vocabulario cerrado
// que este plan retira como criterio (ver arriba).
const VOCABULARIO_CERRADO_HASTA_LA_RONDA_7 = [
  'en el dispositivo',
  'sigue guardada',
  'nada que reintentar',
  'no se ha perdido',
  'se ha guardado',
  'se han guardado',
  'se borrará',
  'progreso guardado',
  'partida guardada',
  'ya no está',
  'no encontraréis',
]

// FRASE_NO_DETECTADA_EN_LA_RONDA_7 (plan 09-35, cierre de la vía (e) de
// `09-VERIFICATION.md` ronda 8): la segunda oración LITERAL que `endGameBody`
// tenía en `app/pages/[game]/index.vue` justo ANTES del plan 09-32 —
// `git show e09f661^:'app/pages/[game]/index.vue'`, línea 511, no reescrita
// de memoria: `` `El progreso guardado de esta partida (${savedSummary.value})
// se borrará y volveréis a la pantalla de inicio. Si el registro en el
// histórico falla, la app conservará el progreso para que podáis
// reintentarlo.` ``. Esta constante fija solo la SEGUNDA oración, la que la
// ronda 7 encontró viviendo sin detectar en el fichero más vigilado del
// repo. Se fija aquí como fixture SINTÉTICO permanente (Gate S la usa dentro
// de un `sfc` inventado, nunca leyendo el árbol real) para que el gate no
// dependa de que el defecto siga existiendo en el repo.
const FRASE_NO_DETECTADA_EN_LA_RONDA_7 = 'Si el registro en el histórico falla, la app conservará el progreso para que podáis reintentarlo.'

// REDACCIONES_CIRCULARES_DE_LA_RONDA_8 (plan 09-39, Task 2, WR-03): las
// redacciones circulares que 09-REVIEW.md ronda 8 nombró como evasivas del
// detector anterior (gateado tras la subcadena literal única 'la garantía
// real la da'). Fijadas aquí como fixture SINTÉTICO permanente —igual que
// FRASE_NO_DETECTADA_EN_LA_RONDA_7 arriba— para que el gate no dependa de
// que la frase original siga viviendo en ningún fichero: la primera es la
// frase LITERAL que dio nombre al defecto; las otras dos son las
// alternativas que 09-REVIEW.md enumera explícitamente para demostrar que
// el vocabulario cerrado de una sola subcadena no las alcanzaba. Ninguna
// nombra un fichero (`.ts`/`.vue`) ni un identificador de código — las tres
// tienen que dar `false` en `motivoNombraAlgoComprobable`.
const REDACCIONES_CIRCULARES_DE_LA_RONDA_8 = [
  'la garantía real la da el otro gate de este mismo fichero, así que no hace falta repetirla aquí',
  'el respaldo real lo garantiza Gate B más abajo, sin que haga falta detallar nada más en este sitio',
  'eso ya lo cubre el otro gate de este fichero, así que no hace falta repetir nada más aquí en detalle',
]

// AfirmacionAuditada (plan 09-34, Task 2, cierre del agravante que hace falso
// el sello: una excepción auditada cuyo motivo escrito afirma lo contrario
// de lo verificado). La ronda 8 (09-VERIFICATION.md) encontró una excepción
// cuyo motivo afirmaba que `endGameBody` «es cierto en las cuatro salidas» —
// falso — y otra cuyo motivo era explícitamente circular («la garantía real
// la da Gate B»). Un motivo en prosa no se puede comprobar; una RUTA sí:
// `respaldo` obliga a nombrar un fichero real del repo que EJERCE la
// comprobación que el motivo describe (normalmente el test puro que fija la
// copy o la decisión), y `respaldoExiste` (más abajo) es el gate que
// comprueba que esa ruta existe de verdad.
interface AfirmacionAuditada {
  raiz: string
  motivo: string
  respaldo: string
}

// Excepciones auditadas a mano, por FICHERO y por RAÍZ (plan 09-30, cierre
// de T-09-30-06; migradas de FRASE a RAÍZ en el plan 09-34 junto con el
// criterio de Gate A): un fichero auditado NO es una puerta abierta a
// cualquier raíz futura — solo las raíces listadas para ese fichero, cada
// una con su motivo escrito como un hecho comprobable, pasan el gate.
// Re-medido en el plan 09-34 tras el criterio nuevo (ver el SUMMARY del plan
// para la lista completa de la medición): tres ficheros que antes escapaban
// al vocabulario cerrado por tener «dispositivo»/«progreso guardado» sin la
// subcadena exacta vigilada entran ahora en el barrido
// (`AppHeader.vue`/`VoiceUnavailableNotice.vue` por la raíz `dispositivo`,
// `useProgressMismatchMark.ts` —nuevo en el plan 09-33— por `guardad`/
// `progreso`). La forma de esta constante y el respaldo comprobable de cada
// entrada se completan en la Task 2 de este mismo plan (interface
// `AfirmacionAuditada`); esta Task 1 solo migra los VALORES de frase a raíz
// para que Gate A siga en verde con el criterio nuevo.
const AFIRMACIONES_AUDITADAS: Record<string, AfirmacionAuditada[]> = {
  'app/components/ResumePrompt.vue': [
    {
      raiz: 'guardad',
      motivo: 'Solo se monta cuando planProgressMount devuelve action: \'resume-prompt\', es decir cuando la autoridad ya ha leído el dispositivo y resume() ha resuelto una posición real.',
      respaldo: 'app/composables/__tests__/useProgressMountPlan.test.ts',
    },
    {
      raiz: 'progreso',
      motivo: '«Empezar una nueva borrará el progreso guardado» describe lo que onDiscardConfirm hace incondicionalmente al pulsar «Empezar nueva» en este mismo modal, y el modal solo se monta tras la lectura real que useProgressMountPlan.test.ts fija.',
      respaldo: 'app/composables/__tests__/useProgressMountPlan.test.ts',
    },
  ],
  'app/components/ContentChangedNotice.vue': [
    {
      raiz: 'guardad',
      motivo: 'Solo se monta con outcome: \'content-changed\', que resume() produce únicamente tras leer una posición válida en el dispositivo — mismo respaldo que ResumePrompt.vue, el otro componente cuyo montaje depende de la misma decisión.',
      respaldo: 'app/composables/__tests__/useProgressMountPlan.test.ts',
    },
  ],
  // MOVIDO desde `app/pages/[game]/index.vue` en el plan 09-32 (arreglo
  // mínimo de Gate A tras la reescritura de `endGameBody`): `discardBody` y
  // `endGameBody` ya no viven como literales de plantilla en el SFC, sino
  // como funciones puras exportadas aquí, con test propio.
  'app/composables/useGameEndCopy.ts': [
    {
      raiz: 'guardad',
      motivo: 'onDiscardConfirm llama a clear(gameId) SIN condición, así que «se borrará» es cierto siempre que buildDiscardBody se muestra; buildEndGameBody solo promete lo que preserveProgress garantiza en las cuatro salidas de <GameOutcomeDialog>.',
      respaldo: 'app/composables/__tests__/useGameEndCopy.test.ts',
    },
    {
      raiz: 'progreso',
      motivo: 'Misma comprobación rama por rama que la raíz "guardad" de esta entrada: buildDiscardBody/buildEndGameBody nombran "el progreso guardado" solo donde preserveProgress/clear(gameId) lo respaldan.',
      respaldo: 'app/composables/__tests__/useGameEndCopy.test.ts',
    },
    {
      raiz: 'se borrar',
      motivo: 'buildEndGameBody/buildDiscardBody: "se borrará" describe exactamente lo que preserveProgress === false / clear(gameId) incondicional garantizan, verificado rama por rama sobre las cuatro salidas de <GameOutcomeDialog>.',
      respaldo: 'app/composables/__tests__/useGameEndCopy.test.ts',
    },
  ],
  // useHistorySavedNotice.ts es LA casa de la copy respaldada por la
  // autoridad: Gate B (más abajo) ya audita NOTICE_BODY/NOTICE_HEADING
  // entrada por entrada contra las variantes que
  // `readStoredProgress`/`resolveNoticeVariant` pueden producir de verdad.
  // El respaldo elegido aquí (`avisoTrasRegistroFallido.test.ts`) es el test
  // de COSTURA que recorre almacenamiento → autoridad → decisión → copy —
  // deliberadamente NO circular, a diferencia del motivo que este plan
  // retira («la garantía real la da Gate B», 09-VERIFICATION.md ronda 8):
  // aquí se nombra el fichero concreto que EJERCE el camino completo, no
  // solo otro gate de este mismo fichero.
  'app/composables/useHistorySavedNotice.ts': [
    {
      raiz: 'dispositivo',
      motivo: 'Las cuatro variantes de fallo solo se alcanzan pasando por readStoredProgress; el camino completo (lectura → planGameEnd → NoticeVariant → NOTICE_HEADING/NOTICE_BODY) está recorrido de punta a punta.',
      respaldo: 'app/composables/__tests__/avisoTrasRegistroFallido.test.ts',
    },
    {
      raiz: 'guardad',
      motivo: 'NOTICE_BODY[\'failure-recoverable\'] ("sigue guardada en el dispositivo") solo se pinta cuando planGameEnd decide esa variante a partir de una lectura real de StoredProgress.',
      respaldo: 'app/composables/__tests__/avisoTrasRegistroFallido.test.ts',
    },
    {
      raiz: 'guardar',
      motivo: 'Los cuatro titulares de fallo de NOTICE_HEADING ("No se pudo guardar la partida") y el cuerpo de failure-stale comparten el mismo origen: planGameEnd, nunca un literal escrito a mano.',
      respaldo: 'app/composables/__tests__/avisoTrasRegistroFallido.test.ts',
    },
    {
      raiz: 'reintent',
      motivo: 'La instrucción de reintento de failure-recoverable, y su ausencia deliberada en failure-unrecoverable/failure-stale, están fijadas rama por rama contra el resultado real de planGameEnd.',
      respaldo: 'app/composables/__tests__/avisoTrasRegistroFallido.test.ts',
    },
    {
      raiz: 'no se ha perdido',
      motivo: 'NOTICE_BODY[\'failure-recoverable\'] solo afirma "la partida no se ha perdido" cuando stored === \'resumable\', el único caso que planGameEnd produce para esa variante.',
      respaldo: 'app/composables/__tests__/avisoTrasRegistroFallido.test.ts',
    },
    {
      raiz: 'no encontraréis',
      motivo: 'NOTICE_BODY[\'failure-unrecoverable\'] ("no encontraréis esta partida") solo se pinta cuando stored === \'absent\', comprobado por readStoredProgress, nunca inventado.',
      respaldo: 'app/composables/__tests__/avisoTrasRegistroFallido.test.ts',
    },
  ],
  'app/composables/useProgressMountPlan.ts': [
    {
      raiz: 'guardad',
      motivo: 'UNVERIFIED_PROGRESS_NOTICE ("una partida guardada") y el resto de planProgressMount son función pura y TOTAL sobre los cuatro valores de StoredProgress, fijada rama por rama.',
      respaldo: 'app/composables/__tests__/useProgressMountPlan.test.ts',
    },
    {
      raiz: 'guardar',
      // Motivo reescrito (plan 09-39, Task 1, medición de WR-02): la
      // redacción anterior no nombraba ningún identificador comprobable —
      // «mini-setup» no es código— y la raíz 'guardar' no aparece en el
      // contenido del respaldo citado, así que respaldoRespaldaA la ponía en
      // ROJO. Se nombra planProgressMount, la función que de verdad produce
      // este aviso (única cadena para stored === 'unknown').
      motivo: '"al guardar la nueva podríais sustituirla" es parte de UNVERIFIED_PROGRESS_NOTICE, la única cadena que planProgressMount devuelve para stored === \'unknown\', fijada rama por rama contra los cuatro valores de StoredProgress.',
      respaldo: 'app/composables/__tests__/useProgressMountPlan.test.ts',
    },
    {
      raiz: 'dispositivo',
      motivo: '"este dispositivo tiene una partida guardada" solo se afirma —como ignorancia, no como hecho— cuando stored === \'unknown\'; planProgressMount es total y testeada sobre los cuatro valores.',
      respaldo: 'app/composables/__tests__/useProgressMountPlan.test.ts',
    },
  ],
  // NUEVAS en el plan 09-34: bajo el vocabulario cerrado de la ronda 7,
  // «Sin voz en este dispositivo»/«Voz no disponible en este dispositivo»
  // escapaban al barrido porque la subcadena exacta vigilada era «en el
  // dispositivo», no «este dispositivo». La raíz `dispositivo` sí las
  // alcanza — correctamente, porque SÍ nombran el dispositivo, aunque hablen
  // de disponibilidad de VOZ, no de datos guardados del grupo.
  'app/components/AppHeader.vue': [
    {
      raiz: 'dispositivo',
      motivo: '"Voz no disponible en este dispositivo" describe voiceState/showVoiceUnavailableNotice, calculados por resolveVoiceState/resolveEffectiveAvailability únicamente a partir de audioAvailable/spanishVoiceAvailable — nunca de StoredProgress.',
      respaldo: 'app/composables/__tests__/useVoiceAnnouncer.test.ts',
    },
  ],
  'app/components/VoiceUnavailableNotice.vue': [
    {
      raiz: 'dispositivo',
      motivo: '"Sin voz en este dispositivo" es el mismo aviso de disponibilidad de voz que AppHeader.vue, con el mismo respaldo: resolveEffectiveAvailability nunca lee el progreso guardado del grupo.',
      respaldo: 'app/composables/__tests__/useVoiceAnnouncer.test.ts',
    },
  ],
  // NUEVO en el plan 09-33 (primera vez que Gate A lo barre, bajo el
  // criterio por raíces del 09-34): PROGRESS_MISMATCH_WARNING solo se pinta
  // cuando readProgressMismatchWarning encuentra una marca puesta por
  // planGameEnd/markProgressMismatch al cerrar la partida anterior — nunca
  // se inventa aquí.
  'app/composables/useProgressMismatchMark.ts': [
    {
      raiz: 'guardad',
      motivo: 'PROGRESS_MISMATCH_WARNING solo se pinta tras markProgressMismatch, que solo se llama cuando planGameEnd (useHistorySavedNotice.ts) decide progressMismatch === true a partir de una lectura real.',
      respaldo: 'app/composables/__tests__/useProgressMismatchMark.test.ts',
    },
    {
      raiz: 'progreso',
      motivo: 'El texto tiene comprobación de respaldo oración a oración, con tests dedicados por cada aserción positiva y negativa sobre lo que planGameEnd comprobó de verdad.',
      respaldo: 'app/composables/__tests__/useProgressMismatchMark.test.ts',
    },
  ],
  // NUEVA en el plan 09-39 (deferred-items.md, ronda 8/plan 09-38, hallazgo
  // 1): huellaDelProgreso contiene, en código real, la subcadena «progreso»
  // — una raíz vigilada — pero no es una afirmación EXTERNA sin respaldo:
  // es la propia autoridad (`readStoredProgress`) calculando su huella
  // sobre lo que ACABA de leer del dispositivo, en el único sitio con
  // permiso para producir ese hecho. Un falso positivo estructural de Gate A
  // (basado en subcadenas, no en quién produce el dato), no un hallazgo real.
  'app/composables/useStoredProgress.ts': [
    {
      raiz: 'progreso',
      motivo: 'huellaDelProgreso es la propia autoridad de lectura calculando su huella sobre PersistedPosition, nunca una afirmación externa sobre el progreso guardado del grupo — la autoridad tiene permiso para producir este hecho, fijado por sus propios tests de huella.',
      respaldo: 'app/composables/__tests__/useStoredProgress.test.ts',
    },
  ],
}

// frasesSinAuditarDe (plan 09-34, preparación de la vía (e) de
// `09-VERIFICATION.md` ronda 8): la DECISIÓN de Gate A extraída a una
// función pura exportada. Hasta este plan vivía inline dentro del `it.each`
// de Gate A, así que ningún otro gate (ni el futuro Gate S del plan 09-35)
// podía ejercerla — un cambio futuro que invirtiera el filtro o cambiara el
// valor por defecto de las auditadas dejaría Gate S en verde mientras Gate A
// dejaba de detectar nada. El plan 09-35 es quien la ejerce.
export function frasesSinAuditarDe(ruta: string, contenido: string): string[] {
  const region = regionVigilada(contenido)
  const raicesEncontradas = RAICES_SOBRE_LOS_DATOS_DEL_GRUPO.filter(raiz => contieneRaizSobreLosDatosDelGrupo(region, raiz))
  // Task 2 (plan 09-34): AFIRMACIONES_AUDITADAS pasó de Record<string,
  // string[]> a Record<string, AfirmacionAuditada[]> — se extrae `.raiz` de
  // cada entrada para mantener la misma comparación de antes.
  const raicesAuditadas = (AFIRMACIONES_AUDITADAS[ruta] ?? []).map(afirmacion => afirmacion.raiz)
  // Auditar un fichero NO exime todas sus raíces futuras (T-09-30-06): solo
  // las raíces explícitamente listadas para ESE fichero pasan el gate.
  return raicesEncontradas.filter(raiz => !raicesAuditadas.includes(raiz))
}

// Las cuatro variantes que SÍ pueden afirmar algo sobre el dispositivo,
// porque las cuatro solo se alcanzan pasando por `readStoredProgress`
// (`resolveNoticeVariant`/`planGameEnd`). `success` no está aquí a
// propósito: su cuerpo es `null` (ver Gate B más abajo). `'failure-stale'`
// (plan 09-28) se añade en el 09-30: con la comparación insensible a
// mayúsculas de arriba, su cuerpo («…En el dispositivo solo queda…») entra
// en el barrido de NOTICE_BODY y necesita estar en esta lista para que Gate
// B no lo trate como una afirmación no respaldada.
const VARIANTES_RESPALDADAS_POR_LA_AUTORIDAD = ['failure-recoverable', 'failure-stale', 'failure-unrecoverable', 'failure-unknown']

// variantesSinRespaldoDe (plan 09-35, extracción de la DECISIÓN de Gate B,
// vías (b)/(e) de `09-VERIFICATION.md` ronda 8): mismo motivo que
// `frasesSinAuditarDe` arriba — mientras la decisión vivía inline dentro de
// un `it`, ningún otro gate podía ejercerla ni demostrar que se pone roja.
// Concatena las entradas de los dos registros (nunca el spread
// `{ ...titulares, ...cuerpos }`: comparten las mismas claves y el spread
// descartaría los titulares — el plan 09-34 ya dejó escrito por qué). Un
// cuerpo `null` nunca produce detección. Los parámetros son `Record<string,
// ...>` genéricos (no `Record<NoticeVariant, ...>`) para que Gate S pueda
// ejercerla con registros SINTÉTICOS de variantes inventadas, sin depender
// de las cinco variantes reales.
export function variantesSinRespaldoDe(
  titulares: Record<string, string | null>,
  cuerpos: Record<string, string | null>,
  respaldadas: string[],
): string[] {
  const variantesSinRespaldo: string[] = []
  for (const [variante, texto] of [...Object.entries(titulares), ...Object.entries(cuerpos)]) {
    if (texto === null) continue
    const tieneRaizVigilada = RAICES_SOBRE_LOS_DATOS_DEL_GRUPO.some(raiz => contieneRaizSobreLosDatosDelGrupo(texto, raiz))
    if (tieneRaizVigilada && !respaldadas.includes(variante) && !variantesSinRespaldo.includes(variante)) {
      variantesSinRespaldo.push(variante)
    }
  }
  return variantesSinRespaldo
}

// LITERALES_VARIANTE (WR-03, 09-REVIEW.md ronda 6; ampliada en el plan
// 09-34, Task 3, vía (c) de 09-VERIFICATION.md ronda 8): promovida a
// ámbito de módulo para que un test pueda comprobar directamente su
// contenido, además de que Gate C la use para barrer el árbol. Ámbito de
// módulo (no dentro del `it` de Gate C, como hasta este plan) para que este
// test de arriba (RED, plan 09-34) y el propio Gate C compartan la MISMA
// lista — nunca dos copias que puedan divergir en silencio.
// `'success'` es NUEVO en el plan 09-34: el literal más peligroso de
// escribir a mano, porque pinta «✓ Partida registrada» sin haber pasado por
// `record()`. El único fichero autorizado sigue siendo
// `useHistorySavedNotice.ts`, que es quien lo define — el plan 09-32 ya
// retiró la única aparición que existía fuera (`HistorySavedNotice.vue`,
// sustituida por `isSuccessVariant`).
const LITERALES_VARIANTE = ['\'failure-recoverable\'', '\'failure-stale\'', '\'failure-unrecoverable\'', '\'failure-unknown\'', '\'success\'']

// Los CINCO únicos ficheros con motivo legítimo para nombrar el estado del
// dispositivo, cada uno con su motivo (WR-10, 09-REVIEW.md ronda 6: esta
// cabecera decía «cuatro» mientras la lista de abajo ya tenía cinco
// entradas desde el plan 09-30 — corregido en el plan 09-34 para que el
// número que anuncia coincida con el número de entradas):
// - `useStoredProgress.ts`: LOS PRODUCE (es la autoridad).
// - `useHistorySavedNotice.ts`: los TRADUCE a copy (`resolveNoticeVariant`).
// - `usePersistedSession.ts`: usa `'absent'` (y `'unreadable'`, fuera del
//   vigilado) en su tipo `RawRead`, la lectura EN CRUDO de la capa de
//   almacenamiento — un homónimo legítimo y ANTERIOR a `StoredProgress`, no
//   el mismo concepto. `'absent'` entra en el conjunto vigilado a propósito:
//   es el valor que estaba en el centro del defecto de la ronda 5 (afirmar
//   una ausencia sin comprobarla), así que dejarlo fuera del gate sería
//   vigilar todo menos justo lo que falló.
// - `app/pages/[game]/index.vue` (plan 09-28, arreglo mínimo del gate,
//   `<scope_boundary>` de 09-28-PLAN.md): NO compara ni inventa un estado —
//   usa `'unknown'` como valor de CAÍDA de una variable (`let stored:
//   StoredProgress = 'unknown'`) que solo cambia si el `try` que envuelve a
//   `readStoredProgress` tiene éxito (WR-06, blindaje de la ventana de
//   cierre de partida). Sin este valor por defecto, una excepción de lectura
//   dejaría `stored` sin inicializar y el cierre de partida sin poder
//   avisar ni navegar — exactamente el defecto que ese blindaje cierra. No
//   se añade aquí ninguna comparación `stored === '...'` (Gate C, segundo
//   test, sigue sin necesitar tocarse).
// - `useProgressMountPlan.ts` (plan 09-29, entrada definitiva escrita en el
//   plan 09-30 —que reformó este fichero para cubrir también `'stale'`—, y
//   cerrada aquí en el 09-34 al retirar el marcador provisional de más
//   arriba, WR-10): traduce `StoredProgress` a la decisión de montaje
//   (`MountAction`), el mismo papel que `useHistorySavedNotice.ts` ya tiene
//   en esta lista (traducir a copy). El `switch (stored)` de
//   `planProgressMount` nombra los cuatro valores porque ES la decisión
//   total sobre ellos — fijada por completo por
//   `app/composables/__tests__/useProgressMountPlan.test.ts` — no una
//   invención.
const FICHEROS_QUE_PUEDEN_NOMBRAR_EL_ESTADO_DEL_DISPOSITIVO = [
  'app/composables/useStoredProgress.ts',
  'app/composables/useHistorySavedNotice.ts',
  'app/composables/usePersistedSession.ts',
  'app/pages/[game]/index.vue',
  'app/composables/useProgressMountPlan.ts',
]

// Recorrido RECURSIVO — nunca una lista tecleada a mano: añadir una pantalla
// o un composable nuevo no puede dejarlo fuera del barrido. `ficherosVueDelArbol`/
// `ficherosTsDelArbol` vienen ahora del vocabulario compartido (plan 09-37);
// aquí solo se filtra `/__tests__/` para construir la copy de la app que
// Gate A audita. WR-04 (09-REVIEW.md ronda 6): el barrido es «copy de la
// app», no solo «templates» — incluye también `app/**/*.ts`, excluyendo
// `/__tests__/` con el mismo criterio que Gate C ya usa (los propios tests
// SÍ necesitan nombrar las frases vigiladas para construir su tabla de
// verdad).
const copyDeLaAppGateA: Record<string, string> = Object.fromEntries(
  Object.entries({ ...ficherosVueDelArbol, ...ficherosTsDelArbol }).filter(([clave]) => !rutaRelativa(clave).includes('/__tests__/')),
)

describe('Criterio por raíces léxicas (plan 09-34, cierre de la vía (a) de 09-VERIFICATION.md ronda 8)', () => {
  it('cada una de las 11 subcadenas del vocabulario cerrado de la ronda 7 contiene al menos una raíz nueva (subsunción: el criterio nuevo no pierde nada del viejo)', () => {
    for (const fraseVieja of VOCABULARIO_CERRADO_HASTA_LA_RONDA_7) {
      const laCubreAlgunaRaiz = RAICES_SOBRE_LOS_DATOS_DEL_GRUPO.some(raiz => fraseVieja.toLowerCase().includes(raiz.toLowerCase()))
      expect(laCubreAlgunaRaiz, `«${fraseVieja}» no está cubierta por ninguna raíz nueva`).toBe(true)
    }
  })

  it('la instancia real y sin detectar de la ronda 7 (endGameBody con "conservará ... reintentarlo") SÍ contiene una raíz nueva', () => {
    const fraseSinDetectarEnLaRonda7 = 'la app conservará el progreso para que podáis reintentarlo'
    expect(RAICES_SOBRE_LOS_DATOS_DEL_GRUPO.some(raiz => fraseSinDetectarEnLaRonda7.includes(raiz))).toBe(true)
  })

  it('contieneRaizSobreLosDatosDelGrupo("la partida\\n  sigue guardada aquí", "sigue guardad") es true', () => {
    expect(contieneRaizSobreLosDatosDelGrupo('la partida\n  sigue guardada aquí', 'sigue guardad')).toBe(true)
  })

  it('contieneRaizSobreLosDatosDelGrupo detecta una RAÍZ partida en dos líneas por un formateador (vía (d), el caso real de normalizarEspacios)', () => {
    const regionPartidaPorUnFormateador = 'la partida sigue\n      guardada en el dispositivo'
    expect(contieneRaizSobreLosDatosDelGrupo(regionPartidaPorUnFormateador, 'sigue guardad')).toBe(true)
  })

  it('contieneRaizSobreLosDatosDelGrupo("SIGUE GUARDADA", "sigue guardad") es true (sigue siendo insensible a mayúsculas)', () => {
    expect(contieneRaizSobreLosDatosDelGrupo('SIGUE GUARDADA', 'sigue guardad')).toBe(true)
  })

  it('frasesSinAuditarDe devuelve [] para un contenido sin ninguna raíz', () => {
    expect(frasesSinAuditarDe('app/components/Cualquiera.vue', 'un texto sin nada que vigilar')).toEqual([])
  })

  it('frasesSinAuditarDe devuelve la raíz encontrada cuando el contenido la tiene y la ruta no la lleva auditada', () => {
    expect(frasesSinAuditarDe('app/components/SinAuditar.vue', 'aquí hay dispositivo')).toEqual(['dispositivo'])
  })

  it('frasesSinAuditarDe devuelve [] cuando la raíz encontrada SÍ está auditada para esa ruta exacta', () => {
    expect(frasesSinAuditarDe('app/components/ResumePrompt.vue', 'Partida guardada')).toEqual([])
  })

  it('frasesSinAuditarDe no mira comentarios ni bloques <style> (usa regionVigilada)', () => {
    const sfcSintetico = '<template><p>hola</p></template>\n<!-- dispositivo -->\n<style>/* dispositivo */</style>'
    expect(frasesSinAuditarDe('app/components/ConComentario.vue', sfcSintetico)).toEqual([])
  })
})

describe('Respaldo comprobable de cada excepción auditada (plan 09-34, Task 2, cierre del agravante de la ronda 8)', () => {
  it('respaldoExiste resuelve un fichero real del repo (app/composables/__tests__/useProgressMountPlan.test.ts)', () => {
    expect(respaldoExiste('app/composables/__tests__/useProgressMountPlan.test.ts')).toBe(true)
  })

  it('respaldoExiste devuelve false para una ruta que no existe en el árbol', () => {
    expect(respaldoExiste('app/composables/no-existe-de-verdad.ts')).toBe(false)
  })

  it('toda entrada de AFIRMACIONES_AUDITADAS tiene motivo y respaldo no vacíos, el respaldo resuelve a un fichero real y ESE fichero respalda de verdad la afirmación (WR-02)', () => {
    for (const [ruta, afirmaciones] of Object.entries(AFIRMACIONES_AUDITADAS)) {
      for (const afirmacion of afirmaciones) {
        expect(afirmacion.motivo.trim().length, `${ruta} (${afirmacion.raiz}) no tiene motivo`).toBeGreaterThan(0)
        expect(afirmacion.respaldo.trim().length, `${ruta} (${afirmacion.raiz}) no tiene respaldo`).toBeGreaterThan(0)
        expect(respaldoExiste(afirmacion.respaldo), `${ruta} (${afirmacion.raiz}) nombra un respaldo que no existe: ${afirmacion.respaldo}`).toBe(true)
        // WR-02 (09-REVIEW.md ronda 8, plan 09-39): que el respaldo EXISTA no
        // basta — cualquier entrada podría citar un fichero real pero sin
        // relación y pasaría igual con solo la comprobación de arriba.
        // respaldoRespaldaA lee el CONTENIDO del respaldo y exige que
        // contenga la raíz o un identificador comprobable del motivo.
        expect(
          respaldoRespaldaA(afirmacion.respaldo, afirmacion.raiz, afirmacion.motivo),
          `${ruta} (raíz «${afirmacion.raiz}»): el respaldo citado (${afirmacion.respaldo}) no contiene ni la `
          + `raíz ni ningún identificador comprobable del motivo — cita un fichero real, pero no lo respalda (WR-02).`,
        ).toBe(true)
      }
    }
  })

  // Cierre explícito de T-09-34: el fichero donde han vivido cinco de las
  // ocho caras del defecto ya NO necesita ninguna excepción auditada — no
  // porque se le perdone una frase, sino porque, tras 09-32/09-33, ya no
  // contiene ninguna afirmación sobre los datos guardados del grupo.
  it('AFIRMACIONES_AUDITADAS no tiene ninguna clave para app/pages/[game]/index.vue', () => {
    expect(Object.keys(AFIRMACIONES_AUDITADAS)).not.toContain('app/pages/[game]/index.vue')
  })

  it('frasesSinAuditarDe sobre el contenido REAL de app/pages/[game]/index.vue devuelve [] — ya no contiene ninguna raíz, no porque esté auditado', () => {
    const clave = Object.keys(ficherosVueDelArbol).find(k => k.endsWith('/pages/[game]/index.vue'))
    expect(clave, 'no se encontró app/pages/[game]/index.vue en el glob de Gate A').toBeDefined()
    const contenido = ficherosVueDelArbol[clave!]!
    expect(frasesSinAuditarDe('app/pages/[game]/index.vue', contenido)).toEqual([])
  })
})

describe('Gate A — ninguna copy de app/ (.vue ni .ts) afirma nada por su cuenta (09-26/09-30)', () => {
  it('barre al menos un fichero real (el gate no está vacío por accidente)', () => {
    expect(Object.keys(copyDeLaAppGateA).length).toBeGreaterThan(0)
  })

  it.each(Object.entries(copyDeLaAppGateA))('%s no afirma nada sobre los datos del grupo en su plantilla, su <script setup> o su .ts sin auditoría', (clave, contenido) => {
    const ruta = rutaRelativa(clave)
    // La decisión vive en frasesSinAuditarDe (plan 09-34, vía (e) de
    // 09-VERIFICATION.md ronda 8): este it.each solo la llama y traduce el
    // resultado al mensaje de diagnóstico — ninguna copia de la lógica
    // queda aquí, para que otro gate (el plan 09-35) pueda ejercer la misma
    // función y comprobar que se pone rojo.
    const raicesSinAuditar = frasesSinAuditarDe(ruta, contenido)

    if (raicesSinAuditar.length > 0) {
      throw new Error(
        `${ruta} afirma sobre los datos guardados del grupo (${raicesSinAuditar.join(', ')}) `
        + 'sin pasar por la autoridad y sin estar en AFIRMACIONES_AUDITADAS con su motivo escrito. '
        + 'Si hace falta una raíz nueva sobre los datos guardados del grupo, tiene que venir de una '
        + 'variante respaldada por readStoredProgress (useHistorySavedNotice.ts), o auditarse aquí '
        + 'con un motivo comprobable.',
      )
    }

    expect(raicesSinAuditar.length).toBe(0)
  })
})

describe('Gate B — la copy del composable solo afirma desde variantes respaldadas por la autoridad (09-26/09-30)', () => {
  it('toda entrada de NOTICE_HEADING y de NOTICE_BODY que afirme algo sobre los datos del grupo tiene una variante respaldada por la autoridad', () => {
    // vía (b), 09-VERIFICATION.md ronda 8: hasta el plan 09-34 Gate B solo
    // recorría NOTICE_BODY, así que un titular nuevo en NOTICE_HEADING
    // podía afirmar algo sobre los datos del grupo sin que ningún gate lo
    // mirara. La decisión vive ahora en `variantesSinRespaldoDe` (plan
    // 09-35, vía (e)): este test solo la llama, para que Gate S pueda
    // ejercer la misma función y demostrar que se pone roja. El titular de
    // éxito («✓ Partida registrada») no contiene ninguna raíz vigilada, así
    // que no le exige nada — la garantía de que nadie lo pinta sin haber
    // pasado por `record()` la da Gate C, más abajo, al vigilar el literal
    // `'success'` (vía (c)).
    expect(variantesSinRespaldoDe(NOTICE_HEADING, NOTICE_BODY, VARIANTES_RESPALDADAS_POR_LA_AUTORIDAD)).toEqual([])
  })

  it('las cuatro variantes respaldadas cubren EXACTAMENTE los cuatro valores de StoredProgress, sin hueco ni solape', () => {
    const variantesProducidas = TODOS_LOS_ESTADOS_DEL_DISPOSITIVO.map(stored => resolveNoticeVariant(false, stored))
    // Biyección: mismo tamaño tras quitar duplicados, y el mismo conjunto.
    expect(new Set(variantesProducidas).size).toBe(TODOS_LOS_ESTADOS_DEL_DISPOSITIVO.length)
    expect([...variantesProducidas].sort()).toEqual([...VARIANTES_RESPALDADAS_POR_LA_AUTORIDAD].sort())
  })

  it('resolveNoticeVariant(true, s) es success para los cuatro valores de StoredProgress', () => {
    for (const stored of TODOS_LOS_ESTADOS_DEL_DISPOSITIVO) {
      expect(resolveNoticeVariant(true, stored)).toBe('success')
    }
  })
})

// IN-05 (09-REVIEW.md ronda 6): `LITERALES`/`patronComparacion` están
// escritos con comilla simple literal, así que `stored === "absent"` o
// `` stored === `absent` `` evadían los tres tests de Gate C. No hay ningún
// paso de lint en el workflow de CI que obligue a la comilla simple, así que
// la evasión es perfectamente construible y compila. Se normaliza el
// contenido ANTES de comparar, sustituyendo comilla doble y comilla invertida
// por comilla simple.
function normalizarComillas(contenido: string): string {
  return contenido.replace(/["`]/g, '\'')
}

describe('Gate C — procedencia del estado del dispositivo (09-26/09-30)', () => {
  const ficherosTs = import.meta.glob('/app/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  const ficherosVue = import.meta.glob('/app/**/*.vue', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  const todosLosFicheros: Record<string, string> = { ...ficherosTs, ...ficherosVue }

  // Fuera del alcance del gate: los propios tests (incluido este fichero),
  // que SÍ necesitan nombrar los cuatro valores para construir su tabla de
  // verdad.
  function ficherosVigilados(): Array<[string, string]> {
    return Object.entries(todosLosFicheros).filter(([clave]) => !rutaRelativa(clave).includes('/__tests__/'))
  }

  // IN-03 (09-REVIEW.md ronda 6): el primer test de Gate C se protegía con
  // esta guarda pero el segundo no — si el glob dejara de resolver, el
  // segundo test pasaría en verde sin una sola aserción ejecutada. Se
  // extrae a un `beforeAll` compartido para que NINGÚN test de este
  // `describe` pueda pasar por no encontrar nada que mirar.
  beforeAll(() => {
    expect(ficherosVigilados().length).toBeGreaterThan(0)
  })

  it('los literales \'resumable\', \'stale\', \'absent\' y \'unknown\' solo aparecen en los ficheros que conocen la autoridad', () => {
    const LITERALES = ['\'resumable\'', '\'stale\'', '\'absent\'', '\'unknown\'']
    for (const [clave, contenidoOriginal] of ficherosVigilados()) {
      const ruta = rutaRelativa(clave)
      const contenido = normalizarComillas(contenidoOriginal)
      const contieneLiteral = LITERALES.some(literal => contenido.includes(literal))
      if (contieneLiteral && !FICHEROS_QUE_PUEDEN_NOMBRAR_EL_ESTADO_DEL_DISPOSITIVO.includes(ruta)) {
        throw new Error(
          `${ruta} nombra el estado del dispositivo ('resumable'/'stale'/'absent'/'unknown') sin ser uno `
          + 'de los ficheros que conocen la autoridad. Quien escribe aquí el estado del dispositivo se lo '
          + 'está inventando en vez de preguntárselo a readStoredProgress.',
        )
      }
    }
    // Si la lista de vigilancia se quedara vacía por un cambio accidental de
    // ruta, este test pasaría por no encontrar nada que mirar — la
    // aserción de abajo lo impide (redundante con el beforeAll, a propósito:
    // IN-03 pedía que NINGÚN test de este fichero pueda pasar en vacío).
    expect(ficherosVigilados().length).toBeGreaterThan(0)
  })

  it('ningún fichero fuera de la lista compara `stored === \'...\'`', () => {
    const patronComparacion = /stored\s*===\s*'/
    for (const [clave, contenidoOriginal] of ficherosVigilados()) {
      const ruta = rutaRelativa(clave)
      const contenido = normalizarComillas(contenidoOriginal)
      if (patronComparacion.test(contenido) && !FICHEROS_QUE_PUEDEN_NOMBRAR_EL_ESTADO_DEL_DISPOSITIVO.includes(ruta)) {
        throw new Error(
          `${ruta} compara \`stored === '...'\` sin ser uno de los ficheros que conocen la autoridad. `
          + 'Quien escribe aquí el estado del dispositivo se lo está inventando en vez de preguntárselo '
          + 'a readStoredProgress.',
        )
      }
    }
  })

  // WR-03 (09-REVIEW.md ronda 6): `useHistorySavedNotice.ts` afirma por
  // escrito que «escribir aquí una variante a mano en vez de obtenerla de
  // `planGameEnd` es exactamente el gesto que el gate de clase persigue» —
  // pero hasta el plan 09-30 el gate NO perseguía ese gesto: solo vigilaba
  // los literales de `StoredProgress`, no los de `NoticeVariant`. Un
  // llamador nuevo podía escribir `notifyHistorySaved('failure-recoverable')`
  // sin haber leído nada del dispositivo, y los tres tests de Gate C se
  // quedaban en verde. Este test cierra esa vía: solo `useHistorySavedNotice.ts`
  // (quien las DEFINE) puede nombrar un literal de `NoticeVariant` fuera de
  // los tests.
  //
  // Se aplica `quitarComentarios` antes de comparar (a diferencia de los dos
  // tests anteriores de este mismo Gate C, que sí miran comentarios):
  // medido en vivo, `useStoredProgress.ts` narra en comentarios históricos
  // («…es exactamente lo que NOTICE_BODY['failure-recoverable'] …») el
  // razonamiento de rondas anteriores sin invocar nunca `notifyHistorySaved`
  // a mano — vigilar esos comentarios pondría el gate rojo por narrativa,
  // no por código, exactamente el mismo tipo de falso positivo que Gate S ya
  // demuestra que `regionVigilada` evita para las frases de datos del grupo.
  it('ningún fichero fuera de useHistorySavedNotice.ts nombra un literal de NoticeVariant a mano (WR-03)', () => {
    const FICHEROS_QUE_DEFINEN_NOTICE_VARIANT = ['app/composables/useHistorySavedNotice.ts']
    for (const [clave, contenidoOriginal] of ficherosVigilados()) {
      const ruta = rutaRelativa(clave)
      const contenido = normalizarComillas(quitarComentarios(contenidoOriginal))
      const contieneLiteral = LITERALES_VARIANTE.some(literal => contenido.includes(literal))
      if (contieneLiteral && !FICHEROS_QUE_DEFINEN_NOTICE_VARIANT.includes(ruta)) {
        throw new Error(
          `${ruta} nombra un literal de NoticeVariant ('failure-recoverable'/'failure-stale'/`
          + `'failure-unrecoverable'/'failure-unknown'/'success') sin ser useHistorySavedNotice.ts, que es `
          + 'quien lo define. Escribir aquí una variante a mano en vez de obtenerla de planGameEnd es '
          + 'exactamente el gesto que este gate persigue (WR-03, 09-REVIEW.md ronda 6; ampliado a \'success\' '
          + 'en el plan 09-34, vía (c) de 09-VERIFICATION.md ronda 8): afirmar sobre el dispositivo sin haber '
          + 'pasado por readStoredProgress, o pintar el éxito sin haber pasado por record().',
        )
      }
    }
  })

  // vía (c), 09-VERIFICATION.md ronda 8: 'success' es el literal más
  // peligroso de escribir a mano porque pinta «✓ Partida registrada» sin
  // haber pasado por record(). Este test comprueba directamente la lista
  // que Gate C usa (LITERALES_VARIANTE, arriba, ámbito de módulo) — si
  // faltara 'success' aquí, el fichero SINTÉTICO del test siguiente ya no
  // demostraría nada real.
  it('LITERALES_VARIANTE vigila también \'success\' (vía (c), 09-VERIFICATION.md ronda 8)', () => {
    expect(LITERALES_VARIANTE).toContain('\'success\'')
  })
})

describe('Gate S — auto-verificación del propio gate (09-30, ampliada en el plan 09-35)', () => {
  // Todos los tests de este describe usan cadenas SINTÉTICAS construidas
  // aquí mismo — nunca leyendo el árbol — salvo las dos aserciones finales
  // de cobertura, que comprueban explícitamente que el gate mira de verdad
  // el fichero de mayor riesgo.
  //
  // Cierre de la vía (e) (plan 09-35): las cinco vías del gap que
  // `09-VERIFICATION.md` ronda 8 enumeró, y qué caso concreto de este
  // describe cierra cada una:
  // (a) vocabulario cerrado sin «conservará»/«reintentarlo» — cerrado por el
  //     caso con FRASE_NO_DETECTADA_EN_LA_RONDA_7: usa la INSTANCIA REAL que
  //     `endGameBody` tenía en el árbol antes del plan 09-32 (tomada de
  //     `git show`, no inventada), demostrando que `frasesSinAuditarDe` la
  //     atrapa y que `VOCABULARIO_CERRADO_HASTA_LA_RONDA_7` no la atrapaba.
  // (b) NOTICE_HEADING fuera de Gate A y Gate B — cerrado por los casos de
  //     `variantesSinRespaldoDe` con titular/cuerpo sintéticos.
  // (c) 'success' sin vigilar en Gate C — cerrado en el plan 09-34
  //     (`LITERALES_VARIANTE` lo incluye; test dedicado en Gate C).
  // (d) comparador sin normalizar espacios — cerrado por el caso de la raíz
  //     partida en dos líneas dentro de un `sfc` sintético.
  // (e) Gate S solo probaba `regionVigilada`, no la DECISIÓN de Gate A/B —
  //     cerrado por todos los casos de este describe que llaman a
  //     `frasesSinAuditarDe`/`variantesSinRespaldoDe`/`respaldoExiste`
  //     directamente, más las cuatro pruebas de mutación ejecutadas y
  //     registradas en el SUMMARY de este plan (09-35).

  it('una frase colocada DESPUÉS del cierre de un <template> anidado SÍ entra en la región vigilada (el hueco de CR-03)', () => {
    const frase = RAICES_SOBRE_LOS_DATOS_DEL_GRUPO[0]!
    const sfcSintetico = `
<script setup lang="ts">
const x = 1
</script>

<template>
  <ClientOnly>
    <template #fallback>
      <p>Cargando…</p>
    </template>
    <p>${frase}</p>
  </ClientOnly>
</template>
`
    expect(regionVigilada(sfcSintetico)).toContain(frase)

    // Esta es la que fallaba (CR-03, 09-REVIEW.md ronda 6): cuantificador
    // perezoso, corta en el PRIMER </template> — el del fallback anidado —
    // y nunca llega a la frase real, dos líneas más abajo.
    const capturaConLaRegexVieja = sfcSintetico.match(/<template[^>]*>([\s\S]*?)<\/template>/)?.[1] ?? ''
    expect(capturaConLaRegexVieja).not.toContain(frase)
  })

  it('una frase dentro de un comentario HTML NO entra en la región vigilada (los comentarios no son copy)', () => {
    const frase = RAICES_SOBRE_LOS_DATOS_DEL_GRUPO[0]!
    const sfcSintetico = `
<template>
  <!-- ${frase} -->
  <p>hola</p>
</template>
`
    expect(regionVigilada(sfcSintetico)).not.toContain(frase)
  })

  it('una frase dentro de un comentario de línea JS de un <script setup> NO entra en la región vigilada', () => {
    const frase = RAICES_SOBRE_LOS_DATOS_DEL_GRUPO[0]!
    const sfcSintetico = `
<script setup lang="ts">
// ${frase}
const x = 1
</script>

<template>
  <p>hola</p>
</template>
`
    expect(regionVigilada(sfcSintetico)).not.toContain(frase)
  })

  it('una frase dentro de un bloque <style> NO entra en la región vigilada', () => {
    const frase = RAICES_SOBRE_LOS_DATOS_DEL_GRUPO[0]!
    const sfcSintetico = `
<template>
  <p>hola</p>
</template>

<style scoped>
/* ${frase} */
.x { color: red; }
</style>
`
    expect(regionVigilada(sfcSintetico)).not.toContain(frase)
  })

  it('una frase dentro de un <script setup> (fuera de comentario) SÍ entra en la región vigilada', () => {
    const frase = RAICES_SOBRE_LOS_DATOS_DEL_GRUPO[0]!
    const sfcSintetico = `
<script setup lang="ts">
const aviso = '${frase}'
</script>

<template>
  <p>hola</p>
</template>
`
    expect(regionVigilada(sfcSintetico)).toContain(frase)
  })

  it('cobertura real: la región vigilada de index.vue contiene GameOutcomeDialog (solo existe DESPUÉS del primer </template>)', () => {
    const clave = Object.keys(ficherosVueDelArbol).find(k => k.endsWith('/pages/[game]/index.vue'))
    expect(clave, 'no se encontró app/pages/[game]/index.vue en el glob de Gate A').toBeDefined()
    const contenido = ficherosVueDelArbol[clave!]!
    expect(regionVigilada(contenido)).toContain('GameOutcomeDialog')
  })

  it('cobertura real: la región vigilada de index.vue contiene endGameBody (solo existe en <script setup>)', () => {
    const clave = Object.keys(ficherosVueDelArbol).find(k => k.endsWith('/pages/[game]/index.vue'))
    expect(clave, 'no se encontró app/pages/[game]/index.vue en el glob de Gate A').toBeDefined()
    const contenido = ficherosVueDelArbol[clave!]!
    expect(regionVigilada(contenido)).toContain('endGameBody')
  })

  // --- Plan 09-35, Task 1: Gate S ejerce la DECISIÓN de Gate A ---

  it('frasesSinAuditarDe detecta una raíz vigilada en un sfc sintético sobre una ruta sin auditar (vía (e): la decisión, no solo la extracción)', () => {
    const sfcSintetico = '<template><p>este dispositivo</p></template>'
    expect(frasesSinAuditarDe('app/components/FicheroQueNoExiste.vue', sfcSintetico)).toContain('dispositivo')
  })

  it('el mismo sfc sintético sobre una ruta con esa raíz auditada devuelve [] (frasesSinAuditarDe respeta la auditoría)', () => {
    const sfcSintetico = '<template><p>este dispositivo</p></template>'
    expect(frasesSinAuditarDe('app/components/AppHeader.vue', sfcSintetico)).toEqual([])
  })

  it('un fichero auditado para una raíz no queda exento de las demás (auditoría parcial, T-09-30-06 ejercida por Gate S)', () => {
    // app/components/ResumePrompt.vue está auditado para 'guardad' y
    // 'progreso' (AFIRMACIONES_AUDITADAS), pero NO para 'dispositivo' —
    // combinación real, sin necesitar ninguna tabla sintética.
    const sfcSintetico = '<template><p>la partida sigue guardada en este dispositivo</p></template>'
    expect(frasesSinAuditarDe('app/components/ResumePrompt.vue', sfcSintetico)).toEqual(['dispositivo'])
  })

  it('la frase real que evadió el gate en la ronda 7, dentro de un sfc sintético sobre una ruta sin auditar, SÍ es atrapada — el criterio cerrado anterior NO la habría atrapado (vía (a), instancia real)', () => {
    const sfcSintetico = `<template><p>${FRASE_NO_DETECTADA_EN_LA_RONDA_7}</p></template>`
    // El gate nuevo (por raíces léxicas) SÍ la atrapa:
    expect(frasesSinAuditarDe('app/components/RutaSinAuditar.vue', sfcSintetico)).not.toHaveLength(0)
    // El criterio cerrado de la ronda 7 (11 subcadenas literales) NO la
    // habría atrapado — la prueba ejecutable de que este cierre resuelve un
    // defecto real, no una hipótesis.
    const laCubreAlgunaSubcadenaVieja = VOCABULARIO_CERRADO_HASTA_LA_RONDA_7.some(sub => FRASE_NO_DETECTADA_EN_LA_RONDA_7.toLowerCase().includes(sub.toLowerCase()))
    expect(laCubreAlgunaSubcadenaVieja).toBe(false)
  })

  it('una raíz partida en dos líneas dentro de un sfc sintético también se detecta (vía (d) ejercida por Gate S)', () => {
    const sfcSintetico = '<template><p>la partida sigue\n      guardada en el dispositivo</p></template>'
    expect(frasesSinAuditarDe('app/components/RutaSinAuditar.vue', sfcSintetico)).toContain('guardad')
  })

  it('una raíz que solo aparece dentro de un comentario NO se detecta (garantía complementaria: el gate no se pone rojo por narrativa)', () => {
    const sfcSintetico = '<template><p>hola</p></template>\n<!-- dispositivo -->'
    expect(frasesSinAuditarDe('app/components/RutaSinAuditar.vue', sfcSintetico)).toEqual([])
  })

  // --- Plan 09-35, Task 2: Gate S ejerce la DECISIÓN de Gate B ---

  it('variantesSinRespaldoDe devuelve [] sobre los registros reales de la app (NOTICE_HEADING/NOTICE_BODY)', () => {
    expect(variantesSinRespaldoDe(NOTICE_HEADING, NOTICE_BODY, VARIANTES_RESPALDADAS_POR_LA_AUTORIDAD)).toEqual([])
  })

  it('un titular sintético con una raíz vigilada fuera de la lista de respaldadas SÍ es detectado (cierra la vía (b): NOTICE_HEADING dejaba de mirarse)', () => {
    const titularesSinteticos = { 'variante-inventada': 'este dispositivo guarda vuestra partida' }
    const cuerposSinteticos = { 'variante-inventada': null }
    expect(variantesSinRespaldoDe(titularesSinteticos, cuerposSinteticos, [])).toContain('variante-inventada')
  })

  it('un cuerpo sintético con una raíz vigilada fuera de la lista de respaldadas SÍ es detectado', () => {
    const titularesSinteticos = { 'variante-inventada': 'Aviso' }
    const cuerposSinteticos = { 'variante-inventada': 'este dispositivo guarda vuestra partida' }
    expect(variantesSinRespaldoDe(titularesSinteticos, cuerposSinteticos, [])).toContain('variante-inventada')
  })

  it('un cuerpo null nunca produce detección en variantesSinRespaldoDe', () => {
    const titularesSinteticos = { 'variante-inventada': 'Aviso' }
    const cuerposSinteticos = { 'variante-inventada': null }
    expect(variantesSinRespaldoDe(titularesSinteticos, cuerposSinteticos, [])).toEqual([])
  })

  it('una variante sin ninguna raíz vigilada no produce detección aunque no esté respaldada — el caso de la variante de éxito', () => {
    // El titular de éxito («✓ Partida registrada») y su cuerpo (null) no
    // contienen ninguna raíz vigilada, así que variantesSinRespaldoDe no le
    // exige nada; la garantía de que nadie la pinta sin pasar por record()
    // la da Gate C, al vigilar el literal 'success' (vía (c)).
    expect(variantesSinRespaldoDe({ success: NOTICE_HEADING.success }, { success: NOTICE_BODY.success }, [])).toEqual([])
  })

  // --- Plan 09-35, Task 3: Gate S ejerce respaldoExiste y la calidad mínima del motivo ---

  it('respaldoExiste resuelve un fichero real del repo (Gate S ejerce respaldoExiste, cierre del agravante de la ronda 8)', () => {
    expect(respaldoExiste('app/composables/__tests__/useProgressMountPlan.test.ts')).toBe(true)
  })

  it('respaldoExiste devuelve false para una ruta inventada', () => {
    expect(respaldoExiste('app/composables/__tests__/esteFicheroNoExiste.test.ts')).toBe(false)
  })

  it('respaldoExiste(\'\') es false', () => {
    expect(respaldoExiste('')).toBe(false)
  })

  // --- Plan 09-39, Task 1: Gate S ejerce respaldoRespaldaA (WR-02) ---
  //
  // Las cuatro viñetas de <behavior> del plan, en el mismo orden en que las
  // enumera. La tercera usa a propósito una ruta REAL del árbol
  // (app/composables/useVoiceAnnouncer.ts) sin relación con la raíz
  // 'guardad' — es el contraejemplo exacto de WR-02 (09-REVIEW.md ronda 8),
  // el mismo que la mutación EJECUTADA y revertida de este plan demuestra
  // (ver el SUMMARY: salida VERDE antes de este test, ROJA después).

  it('respaldoRespaldaA es true cuando el contenido del respaldo contiene la RAÍZ (comparación insensible a mayúsculas y con espacios normalizados)', () => {
    expect(respaldoRespaldaA('app/composables/__tests__/useProgressMountPlan.test.ts', 'guardad', '')).toBe(true)
  })

  it('respaldoRespaldaA es true cuando el contenido contiene un IDENTIFICADOR del motivo, aunque no contenga la raíz', () => {
    // avisoTrasRegistroFallido.test.ts no contiene la raíz 'guardar' (medido
    // en la Task 1 de este plan al corregir la entrada real de
    // useProgressMountPlan.ts), pero SÍ contiene planGameEnd — el
    // identificador que este motivo sintético nombra.
    expect(respaldoRespaldaA('app/composables/__tests__/avisoTrasRegistroFallido.test.ts', 'guardar', 'esto lo respalda planGameEnd')).toBe(true)
  })

  it('respaldoRespaldaA es false para un fichero REAL del árbol sin ninguna relación con la raíz ni con el motivo (el contraejemplo exacto de WR-02)', () => {
    expect(respaldoRespaldaA('app/composables/useVoiceAnnouncer.ts', 'guardad', 'un motivo sin ningún identificador comprobable')).toBe(false)
  })

  it('respaldoRespaldaA es false para una ruta que no existe en el árbol', () => {
    expect(respaldoRespaldaA('app/composables/no-existe-de-verdad.ts', 'guardad', 'planGameEnd')).toBe(false)
  })

  // IN-01 (09-REVIEW.md, INFO-01; 09-VERIFICATION.md ronda 8): el umbral de
  // 40 caracteres MIDE LONGITUD, NUNCA SUSTANCIA — por sí solo es
  // trivialmente rellenable con prosa de relleno («esto está bien, de
  // verdad, en serio, créeme, funciona correctamente» ya pasa el umbral sin
  // decir nada comprobable). Se CONSERVA (no se retira: sigue siendo una
  // condición de calidad legítima — un motivo de una palabra tampoco es un
  // motivo), pero deja de ser la única defensa: la sustancia la comprueban
  // ahora las otras dos condiciones de este mismo describe —
  // `respaldoRespaldaA` (WR-02, Task 1: el respaldo citado tiene que
  // contener de verdad la raíz o un identificador del motivo) y
  // `motivoNombraAlgoComprobable` (WR-03, más abajo: el motivo tiene que
  // nombrar algo que se puede ir a mirar). Las tres juntas hacen que
  // rellenar con prosa deje de bastar — ninguna de las tres, por separado,
  // lo habría impedido.
  it('toda entrada de AFIRMACIONES_AUDITADAS tiene un motivo de al menos 40 caracteres — un motivo de una palabra no es un motivo (IN-01: mide longitud, no sustancia)', () => {
    for (const [ruta, afirmaciones] of Object.entries(AFIRMACIONES_AUDITADAS)) {
      for (const afirmacion of afirmaciones) {
        expect(afirmacion.motivo.length, `${ruta} (${afirmacion.raiz}): motivo demasiado corto`).toBeGreaterThanOrEqual(40)
      }
    }
  })

  // WR-03 (09-REVIEW.md ronda 8, plan 09-39): el detector de motivo
  // circular anterior solo se activaba tras encontrar la subcadena literal
  // 'la garantía real la da' — cualquier motivo IGUAL DE CIRCULAR redactado
  // con otras palabras («eso ya lo cubre el otro gate», «el respaldo real
  // lo garantiza Gate B más abajo»…) nunca entraba en el `if` y pasaba solo
  // con el umbral de 40 caracteres, reproduciendo un nivel más arriba
  // exactamente el mismo vocabulario cerrado que el plan 09-34 sustituyó
  // por raíces léxicas en Gate A/B. La exigencia nueva es INCONDICIONAL —
  // se aplica a TODA entrada, sin ningún `if` que decida primero si el
  // motivo "parece" circular — y no depende de CÓMO esté redactado el
  // motivo, solo de que nombre algo que se puede ir a mirar
  // (`motivoNombraAlgoComprobable`, módulo compartido).
  it('todo motivo de AFIRMACIONES_AUDITADAS nombra algo comprobable — un fichero o un identificador de código, no solo prosa (WR-03: incondicional, sin puerta de entrada por subcadena)', () => {
    for (const [ruta, afirmaciones] of Object.entries(AFIRMACIONES_AUDITADAS)) {
      for (const afirmacion of afirmaciones) {
        expect(
          motivoNombraAlgoComprobable(afirmacion.motivo),
          `${ruta} (raíz «${afirmacion.raiz}»): el motivo no nombra ningún fichero ni identificador comprobable — `
          + 'no basta con que sea largo (IN-01) ni con que evite una frase circular concreta (WR-03): tiene que '
          + 'nombrar algo que se puede ir a mirar.',
        ).toBe(true)
      }
    }
  })

  // --- Plan 09-39, Task 2: Gate S ejerce motivoNombraAlgoComprobable (WR-03) ---
  //
  // Las tres redacciones circulares que 09-REVIEW.md ronda 8 nombró como
  // evasivas (REDACCIONES_CIRCULARES_DE_LA_RONDA_8, fixture permanente
  // arriba): las tres tienen que dar `false`, sin ninguna condición previa
  // que decida primero si "parecen" circulares — la comprobación se ejecuta
  // para TODO motivo, nunca solo para los que contengan una subcadena
  // conocida.
  it.each(REDACCIONES_CIRCULARES_DE_LA_RONDA_8)('motivoNombraAlgoComprobable es false para la redacción circular de la ronda 8: "%s"', (redaccionCircular) => {
    expect(motivoNombraAlgoComprobable(redaccionCircular)).toBe(false)
  })

  it('motivoNombraAlgoComprobable es false para cualquier prosa de relleno de más de 40 caracteres sin identificadores (relleno vacío, IN-01)', () => {
    const prosaDeRelleno = 'esto está bien, de verdad, en serio, créeme, funciona correctamente y sin problemas'
    expect(prosaDeRelleno.length).toBeGreaterThanOrEqual(40)
    expect(motivoNombraAlgoComprobable(prosaDeRelleno)).toBe(false)
  })

  it('motivoNombraAlgoComprobable es true para los ocho motivos reales del mapa (ejecutado sobre el árbol real, no solo sobre fixtures)', () => {
    for (const [ruta, afirmaciones] of Object.entries(AFIRMACIONES_AUDITADAS)) {
      for (const afirmacion of afirmaciones) {
        expect(motivoNombraAlgoComprobable(afirmacion.motivo), `${ruta} (${afirmacion.raiz})`).toBe(true)
      }
    }
  })

  it('identificadoresComprobablesDe reconoce un nombre de fichero (.ts/.vue) y un identificador camelCase de al menos 8 caracteres con mayúscula interior, nunca por lista de palabras', () => {
    expect(identificadoresComprobablesDe('esto lo respalda planGameEnd')).toContain('planGameEnd')
    expect(identificadoresComprobablesDe('ver useProgressMountPlan.test.ts para el detalle')).toContain('useProgressMountPlan.test.ts')
    // Una palabra corta o sin mayúscula interior NO es un identificador comprobable — el criterio es ESTRUCTURAL, no una lista de palabras concretas.
    expect(identificadoresComprobablesDe('corto')).toEqual([])
    expect(identificadoresComprobablesDe('minuscula')).toEqual([])
  })

  // Plan 09-37, Task 3, cierre del tercer `missing:` del segundo gap de
  // `09-VERIFICATION.md` ronda 8: la cabecera de este fichero declara por
  // escrito su alcance (texto-contra-respaldo) y cita a
  // `invariantesDeMarcaDeEstado.test.ts` por ruta. Este test comprueba esa
  // cita por GREP INTERNO sobre el propio contenido del fichero, leído del
  // glob — nunca de memoria — para que borrar la declaración rompa el test
  // en vez de pasar desapercibido.
  it('la cabecera declara por escrito su alcance y cita a invariantesDeMarcaDeEstado.test.ts, que cubre lo que este gate NO cubre (plan 09-37, Task 3)', () => {
    const clave = Object.keys(ficherosTsDelArbol).find(k => k.endsWith('/composables/__tests__/afirmacionesRespaldadas.test.ts'))
    expect(clave, 'no se encontró afirmacionesRespaldadas.test.ts en su propio glob').toBeDefined()
    const contenidoPropio = ficherosTsDelArbol[clave!]!
    expect(contenidoPropio).toContain('app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts')
  })
})
