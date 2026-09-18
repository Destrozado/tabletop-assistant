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
import { NOTICE_BODY, resolveNoticeVariant } from '../useHistorySavedNotice'
import type { StoredProgress } from '../useStoredProgress'

// Los cuatro valores de `StoredProgress`, escritos como constante del test —
// nunca se inventa un quinto ni se deduce de otro sitio. `'stale'` (plan
// 09-28, séptima cara del defecto) se añade aquí en el 09-30: antes de este
// plan Gate B solo conocía los tres valores originales y `'failure-stale'`
// pasaba desapercibido en el barrido de NOTICE_BODY.
const TODOS_LOS_ESTADOS_DEL_DISPOSITIVO: StoredProgress[] = ['resumable', 'stale', 'absent', 'unknown']

// RAICES_SOBRE_LOS_DATOS_DEL_GRUPO (plan 09-34, cierre de la vía (a) de
// `09-VERIFICATION.md` ronda 8): sustituye por completo al vocabulario
// cerrado de subcadenas literales que este fichero usaba hasta este plan
// como criterio de Gate A/B (retirado; ver `VOCABULARIO_CERRADO_HASTA_LA_RONDA_7`
// más abajo, que conserva sus 11 entradas solo como constante de
// comprobación). Aquella lista cerrada de 11 subcadenas demostró
// incapaz de alcanzar a la copy nueva a tiempo — ni «conservará» ni
// «reintentarlo» estaban en ella, así que la frase exacta que hacía daño en
// `endGameBody` (09-VERIFICATION.md ronda 8, vía (a)) ni siquiera entraba en
// el barrido, pese a vivir en el fichero más vigilado del repo. Una RAÍZ
// cubre todas las flexiones de su familia por construcción: `conserv`
// alcanza «conservar», «conservará», «conservado»; `guardad` alcanza
// «guardada», «guardado», «sigue guardado», «está guardada» («no se ha
// borrado» NO — para eso está `se borrar`). Ampliar la copy futura deja de
// exigir ampliar esta lista.
const RAICES_SOBRE_LOS_DATOS_DEL_GRUPO = [
  'conserv',
  'guardad',
  'guardar',
  'dispositivo',
  'progreso',
  'reintent',
  'no se ha perdido',
  'ya no está',
  'no encontraréis',
  'se borrar',
]

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

// normalizarEspacios (plan 09-34, vía (d) de `09-VERIFICATION.md` ronda 8):
// una copy partida en dos líneas por un formateador evade un `includes`
// literal sin mala fe — eso convierte al gate en algo que depende del
// formateo, no del contenido. Se aplica a los dos lados de la comparación
// antes de compararlos: cualquier RUN de espacios en blanco (incluidos
// saltos de línea y la indentación que los sigue) colapsa a un único
// espacio, así que una raíz partida en dos líneas por un formateador queda
// contigua otra vez antes del `includes`.
export function normalizarEspacios(texto: string): string {
  return texto.replace(/\s+/g, ' ')
}

// contieneRaizSobreLosDatosDelGrupo (renombre de
// `contieneFraseSobreLosDatosDelGrupo`, plan 09-34): mismo criterio de
// comparación insensible a mayúsculas de antes, ahora también con los
// espacios normalizados en los dos lados (ver `normalizarEspacios` arriba).
function contieneRaizSobreLosDatosDelGrupo(region: string, raiz: string): boolean {
  return normalizarEspacios(region.toLowerCase()).includes(normalizarEspacios(raiz.toLowerCase()))
}

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

// respaldoExiste (plan 09-34, Task 2): glob PROPIO — a diferencia de los
// globs de Gate A/C, éste NO filtra `/__tests__/`, porque el respaldo típico
// de una excepción es justamente un test puro. Incluye también `engine/`
// (no solo `app/`): un respaldo puede apoyarse en el motor puro.
// STUB deliberado (RED, plan 09-34 Task 2): devuelve siempre `false`, así
// que ningún respaldo —ni siquiera uno real— resuelve todavía. La
// implementación real llega en el commit GREEN.
export function respaldoExiste(_ruta: string): boolean {
  return false
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
const AFIRMACIONES_AUDITADAS: Record<string, string[]> = {
  // Solo se monta cuando `planProgressMount` devuelve `action:
  // 'resume-prompt'`, es decir cuando la autoridad ya ha leído el
  // dispositivo y `resume()` ha resuelto una posición real. «Empezar una
  // nueva borrará el progreso guardado» describe lo que `onDiscardConfirm`
  // hace incondicionalmente (ver el comentario de `discardBody` en
  // index.vue). Auditado en `09-AUDIT-AFIRMACIONES-UI.md` §2 como RESPALDADA.
  'app/components/ResumePrompt.vue': ['guardad', 'progreso'],
  // Solo se monta con `outcome: 'content-changed'`, que `resume()` produce
  // únicamente tras leer una posición válida en el dispositivo. Auditado en
  // `09-AUDIT-AFIRMACIONES-UI.md` §2 como RESPALDADA.
  'app/components/ContentChangedNotice.vue': ['guardad'],
  // MOVIDO desde `app/pages/[game]/index.vue` en el plan 09-32 (Task 2,
  // arreglo mínimo de Gate A para dejar la suite en verde tras la
  // reescritura de `endGameBody`, ver el SUMMARY del plan): `discardBody` y
  // `endGameBody` ya no viven como literales de plantilla en el SFC, sino
  // como funciones puras exportadas aquí, con test propio en
  // `useGameEndCopy.test.ts`. `buildDiscardBody`: `onDiscardConfirm` llama a
  // `clear(gameId)` SIN condición (verificado leyendo la función), así que
  // «se borrará»/«progreso guardado» son ciertos siempre que ese texto se
  // muestra. `buildEndGameBody`: reescrito en la Task 2 del plan 09-32 para
  // ser cierto en las cuatro salidas de <GameOutcomeDialog> — ver el
  // comentario que acompaña a `buildEndGameBody` en ese fichero.
  'app/composables/useGameEndCopy.ts': ['guardad', 'progreso', 'se borrar'],
  // Es LA casa de la copy respaldada por la autoridad: Gate B (más abajo) ya
  // audita NOTICE_BODY entrada por entrada contra las variantes que
  // `readStoredProgress`/`resolveNoticeVariant` pueden producir de verdad.
  // Auditarla aquí SIN ese matiz sería circular — la garantía real de este
  // fichero la da Gate B, no esta excepción; esta entrada solo evita que
  // Gate A (que ahora también barre `.ts`) duplique en falso lo que Gate B
  // ya comprueba con más precisión. La raíz `guardar` es nueva en el 09-34:
  // cubre los titulares de fallo de `NOTICE_HEADING` («No se pudo guardar la
  // partida»), que el vocabulario cerrado de la ronda 7 no alcanzaba.
  'app/composables/useHistorySavedNotice.ts': [
    'dispositivo',
    'guardad',
    'guardar',
    'reintent',
    'no se ha perdido',
    'no encontraréis',
  ],
  // `UNVERIFIED_PROGRESS_NOTICE` solo se emite cuando `stored === 'unknown'`
  // (ver `planProgressMount`), y afirma exactamente eso — que no se ha
  // podido comprobar si hay una partida guardada — nunca que la haya ni que
  // no la haya. Fijado por un test puro en `useProgressMountPlan.test.ts`.
  'app/composables/useProgressMountPlan.ts': ['guardad', 'guardar', 'dispositivo'],
  // NUEVA en el plan 09-34: bajo el vocabulario cerrado de la ronda 7,
  // «Sin voz en este dispositivo»/«Voz no disponible en este dispositivo»
  // escapaban al barrido porque la subcadena exacta vigilada era «en el
  // dispositivo», no «este dispositivo». La raíz `dispositivo` sí las
  // alcanza — correctamente, porque SÍ nombran el dispositivo, aunque hablen
  // de disponibilidad de VOZ, no de datos guardados del grupo:
  // `resolveVoiceState`/`resolveEffectiveAvailability` (`useVoiceAnnouncer.ts`)
  // calculan `voiceState`/`showVoiceUnavailableNotice` únicamente a partir
  // de `audioAvailable`/`spanishVoiceAvailable`, sin leer `StoredProgress`
  // en ningún punto — comprobado por sus tests puros.
  'app/components/AppHeader.vue': ['dispositivo'],
  'app/components/VoiceUnavailableNotice.vue': ['dispositivo'],
  // NUEVO en el plan 09-33 (útil directamente en el plan 09-34, primera vez
  // que Gate A lo barre bajo el criterio por raíces): `PROGRESS_MISMATCH_WARNING`
  // solo se pinta cuando `readProgressMismatchWarning` encuentra una marca
  // puesta por `planGameEnd`/`markProgressMismatch` al cerrar la partida
  // anterior — nunca se inventa aquí. Fijado por el test de respaldo
  // oración a oración de `useProgressMismatchMark.test.ts`.
  'app/composables/useProgressMismatchMark.ts': ['guardad', 'progreso'],
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
  const raicesAuditadas = AFIRMACIONES_AUDITADAS[ruta] ?? []
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

// Los cuatro únicos ficheros con motivo legítimo para nombrar el estado del
// dispositivo, cada uno con su motivo:
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
// - `useProgressMountPlan.ts` (plan 09-29, TODO(09-30) — entrada provisional,
//   el `<scope_boundary>` de 09-29-PLAN.md prohíbe reformar este gate y pide
//   dejar constancia en el SUMMARY en vez de tocarlo): traduce
//   `StoredProgress` a la decisión de montaje (`MountAction`), el mismo
//   papel que `useHistorySavedNotice.ts` ya tiene en esta lista (traducir a
//   copy). El `switch (stored)` de `planProgressMount` nombra los cuatro
//   valores porque ES la decisión total sobre ellos, no una invención — pero
//   la entrada definitiva de auditoría (con el razonamiento completo, igual
//   que las de arriba) la escribe el plan 09-30, que es quien reforma este
//   fichero para cubrir también `'stale'`.
const FICHEROS_QUE_PUEDEN_NOMBRAR_EL_ESTADO_DEL_DISPOSITIVO = [
  'app/composables/useStoredProgress.ts',
  'app/composables/useHistorySavedNotice.ts',
  'app/composables/usePersistedSession.ts',
  'app/pages/[game]/index.vue',
  'app/composables/useProgressMountPlan.ts',
]

// quitarComentarios/regionVigilada (plan 09-30, fix de CR-03/WR-04 de
// `09-REVIEW.md` ronda 6): sustituyen a `extraerTemplate`/
// `quitarComentariosHtml`. La región vigilada deja de intentar acotar
// «el `<template>`» — acotar el bloque es lo que falló, con un cuantificador
// perezoso que cortaba en el PRIMER `</template>` anidado — y pasa a ser el
// FICHERO ENTERO menos lo que de verdad no es copy: comentarios y `<style>`.
// Es más barato barrer de más y auditar las excepciones una a una (con su
// motivo escrito) que confiar en un delimitador que un slot con nombre, un
// `<template v-if>` o un `<script setup>` pueden romper en silencio.
export function quitarComentarios(sfc: string): string {
  return sfc
    .replace(/<!--[\s\S]*?-->/g, '') // comentarios HTML
    .replace(/\/\*[\s\S]*?\*\//g, '') // comentarios de bloque JS
    .replace(/^\s*\/\/.*$/gm, '') // comentarios de línea JS
}

export function regionVigilada(sfc: string): string {
  return quitarComentarios(sfc).replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
}

// Ruta relativa desde la raíz del repo (p. ej. `app/components/ResumePrompt.vue`),
// para que `AFIRMACIONES_AUDITADAS`/`FICHEROS_QUE_PUEDEN_NOMBRAR_EL_ESTADO_DEL_DISPOSITIVO`
// se escriban con la misma forma que el resto del repo usa al citar un fichero.
function rutaRelativa(clave: string): string {
  return clave.replace(/^\/+/, '')
}

// Recorrido RECURSIVO — nunca una lista tecleada a mano: añadir una pantalla
// o un composable nuevo no puede dejarlo fuera del barrido. Módulo-scope (no
// dentro del `describe` de Gate A) para que Gate S (auto-verificación) pueda
// usar el mismo glob de `.vue` al comprobar la cobertura sobre el árbol
// real, en vez de leer una ruta tecleada a mano.
//
// WR-04 (09-REVIEW.md ronda 6): el barrido pasa a ser «copy de la app», no
// solo «templates» — un segundo `import.meta.glob` añade `app/**/*.ts`,
// excluyendo `/__tests__/` con el mismo criterio que Gate C ya usa (los
// propios tests SÍ necesitan nombrar las frases vigiladas para construir su
// tabla de verdad).
const ficherosVueGateA = import.meta.glob('/app/**/*.vue', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const ficherosTsGateA = import.meta.glob('/app/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const copyDeLaAppGateA: Record<string, string> = Object.fromEntries(
  Object.entries({ ...ficherosVueGateA, ...ficherosTsGateA }).filter(([clave]) => !rutaRelativa(clave).includes('/__tests__/')),
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
  it('toda entrada de NOTICE_BODY que afirme algo sobre los datos del grupo tiene una variante respaldada por la autoridad', () => {
    for (const [variante, cuerpo] of Object.entries(NOTICE_BODY)) {
      const raicesEncontradas = cuerpo === null ? [] : RAICES_SOBRE_LOS_DATOS_DEL_GRUPO.filter(raiz => contieneRaizSobreLosDatosDelGrupo(cuerpo, raiz))
      if (raicesEncontradas.length > 0) {
        expect(VARIANTES_RESPALDADAS_POR_LA_AUTORIDAD).toContain(variante)
      }
    }
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
    const LITERALES_VARIANTE = ['\'failure-recoverable\'', '\'failure-stale\'', '\'failure-unrecoverable\'', '\'failure-unknown\'']
    const FICHEROS_QUE_DEFINEN_NOTICE_VARIANT = ['app/composables/useHistorySavedNotice.ts']
    for (const [clave, contenidoOriginal] of ficherosVigilados()) {
      const ruta = rutaRelativa(clave)
      const contenido = normalizarComillas(quitarComentarios(contenidoOriginal))
      const contieneLiteral = LITERALES_VARIANTE.some(literal => contenido.includes(literal))
      if (contieneLiteral && !FICHEROS_QUE_DEFINEN_NOTICE_VARIANT.includes(ruta)) {
        throw new Error(
          `${ruta} nombra un literal de NoticeVariant ('failure-recoverable'/'failure-stale'/`
          + `'failure-unrecoverable'/'failure-unknown') sin ser useHistorySavedNotice.ts, que es quien lo `
          + 'define. Escribir aquí una variante a mano en vez de obtenerla de planGameEnd es exactamente '
          + 'el gesto que este gate persigue (WR-03, 09-REVIEW.md ronda 6): afirmar sobre el dispositivo '
          + 'sin haber pasado por readStoredProgress.',
        )
      }
    }
  })
})

describe('Gate S — auto-verificación del propio gate (09-30)', () => {
  // Todos los tests de este describe usan cadenas SINTÉTICAS construidas
  // aquí mismo — nunca leyendo el árbol — salvo las dos aserciones finales
  // de cobertura, que comprueban explícitamente que el gate mira de verdad
  // el fichero de mayor riesgo.

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
    const clave = Object.keys(ficherosVueGateA).find(k => k.endsWith('/pages/[game]/index.vue'))
    expect(clave, 'no se encontró app/pages/[game]/index.vue en el glob de Gate A').toBeDefined()
    const contenido = ficherosVueGateA[clave!]!
    expect(regionVigilada(contenido)).toContain('GameOutcomeDialog')
  })

  it('cobertura real: la región vigilada de index.vue contiene endGameBody (solo existe en <script setup>)', () => {
    const clave = Object.keys(ficherosVueGateA).find(k => k.endsWith('/pages/[game]/index.vue'))
    expect(clave, 'no se encontró app/pages/[game]/index.vue en el glob de Gate A').toBeDefined()
    const contenido = ficherosVueGateA[clave!]!
    expect(regionVigilada(contenido)).toContain('endGameBody')
  })
})
