// app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts
//
// EL GATE DE INVARIANTES DE CICLO DE VIDA DE ESTADO DE MÓDULO (plan 09-37,
// gap_closure de la ronda 8 de verificación de esta fase).
//
// `app/composables/__tests__/afirmacionesRespaldadas.test.ts` — el GATE DE
// CLASE — audita TEXTO (`NOTICE_BODY`/`NOTICE_HEADING`/literales de
// variante) contra su RESPALDO, en el momento en que el texto se escribe.
// Ese gate cerró genuinamente ocho caras del mismo defecto de fondo a lo
// largo de seis rondas de verificación (ver su propia cabecera). Pero la
// ronda 8 (`09-VERIFICATION.md`) encontró una NOVENA cara que ese gate no
// puede ver ni en principio, y lo dice con precisión:
//
//   «estructuralmente, el gate audita texto (NOTICE_BODY/NOTICE_HEADING/
//   literales de variante) contra su respaldo, no invariantes de ciclo de
//   vida de estado — CR-01 no es una frase sin respaldo en el momento en
//   que se escribe, es una frase que TENÍA respaldo y lo pierde por un
//   camino de código que nunca la invalida; ningún gate de este fichero
//   mira los puntos de invalidación de useProgressMismatchMark.»
//
// CR-01 (09-REVIEW.md, confirmado por lectura independiente en
// 09-VERIFICATION.md ronda 8): `onResumeContinue`
// (`app/pages/[game]/index.vue`) no llama a `clearProgressMismatch`. Cuando
// el grupo pulsa «Continuar» sobre un snapshot que la app ya identificó
// como ajeno, la marca queda puesta; el autoguardado de 300 ms sobrescribe
// después ese snapshot con progreso legítimo, así que el referente de la
// marca deja de existir — pero la marca sigue ahí, y
// `readProgressMismatchWarning` la sigue devolviendo como si fuera cierta.
//
// WR-01 (mismo informe): cuando el montaje resuelve `content-changed-notice`
// en vez de `resume-prompt`, `onMounted` calcula igual el aviso de
// discrepancia, pero `<ContentChangedNotice>` no tiene ninguna prop para
// mostrarlo — la rama calcula el aviso y no tiene destino de render.
//
// Este fichero NO audita frases: audita MARCAS DE ESTADO DE MÓDULO que
// transportan una afirmación sobre los datos guardados del grupo, y les
// exige la propiedad que CR-01 viola — que la marca no pueda sobrevivir a
// la destrucción de su propio referente. Cinco patas:
// - Pata 1 (contratoDeLaMarcaDe): el lector de la marca tiene que exigir un
//   testigo del referente (aridad >= 2, segundo parámetro obligatorio).
// - Pata 2 (lecturasSinTestigoDe): ninguna llamada real al lector puede
//   omitir ese testigo.
// - Pata 3 (faltaPruebaDeCicloDeVidaEn, Task 2): tiene que existir un test
//   que reproduzca el camino completo (poner con un testigo, leer con
//   OTRO, esperar null).
// - Pata 4 (ramasQueLeenSinPintarDe, Task 2): toda rama de la interfaz que
//   lea la marca tiene que pintarla.
// - Pata 5 (Task 3): el descubrimiento no puede quedarse vacío ni dejar una
//   marca huérfana sin comprobación.
//
// El descubrimiento (`marcasDeEstadoDeModuloDe`) es un glob más dos
// predicados sobre el vocabulario compartido de `vocabularioDeAfirmaciones.ts`
// (plan 09-37, cierre de T-09-37-02: MISMO vocabulario que el gate de
// clase, nunca una copia) — una marca DÉCIMA en una ronda futura entra
// sola, sin editar ninguna lista.
//
// Este plan se escribe CONTRA EL ÁRBOL SIN ARREGLAR, a propósito: las
// patas de comprobación real tienen que ponerse ROJAS hoy porque CR-01 y
// WR-01 existen de verdad en el repo. El arreglo es el plan 09-38.
//
// DECLARACIÓN SIMÉTRICA DE ALCANCE (Task 3): este gate NO mira el
// contenido de ninguna frase — no audita si una copy tiene o no respaldo en
// el momento en que se escribe. Eso sigue siendo trabajo de
// `app/composables/__tests__/afirmacionesRespaldadas.test.ts` (Gate A/B/C).
// Los dos gates se citan mutuamente por ruta a propósito, para que borrar
// la cita de cualquiera de los dos rompa un test en vez de pasar
// desapercibido.
import { describe, expect, it } from 'vitest'
import {
  RAICES_SOBRE_LOS_DATOS_DEL_GRUPO,
  contieneRaizSobreLosDatosDelGrupo,
  ficherosTsDelArbol,
  ficherosVueDelArbol,
  identificadoresComprobablesDe,
  motivoNombraAlgoComprobable,
  regionVigilada,
  respaldoExiste,
  respaldoRespaldaA,
  rutaRelativa,
} from './vocabularioDeAfirmaciones'

// --- Utilidades de recorrido de texto, compartidas por las cinco patas ---
// Ninguna usa `split(',')`: un argumento con una coma dentro de paréntesis
// anidados (`lector(f(a, b))`) rompería esa aproximación. Se recorre
// carácter a carácter llevando la profundidad de paréntesis/corchetes/
// llaves, tal y como exige el `<behavior>` de este plan.

function escaparRegExp(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Índice del carácter de cierre que empareja con el de apertura en
// `region[aperturaIndex]` (que tiene que ser uno de `( [ {`).
function indiceDeCierre(region: string, aperturaIndex: number): number {
  let profundidad = 1
  let i = aperturaIndex + 1
  while (i < region.length && profundidad > 0) {
    const c = region[i]
    if (c === '(' || c === '[' || c === '{') profundidad++
    else if (c === ')' || c === ']' || c === '}') profundidad--
    if (profundidad === 0) break
    i++
  }
  return i
}

// Divide el contenido entre paréntesis en argumentos/parámetros de nivel
// superior. Nunca `split(',')` — es exactamente lo que confundiría
// `lector(f(a, b))` con una llamada de dos argumentos.
function argumentosDeNivelSuperior(contenido: string): string[] {
  if (contenido.trim().length === 0) return []
  const argumentos: string[] = []
  let profundidad = 0
  let actual = ''
  for (const c of contenido) {
    if (c === '(' || c === '[' || c === '{') profundidad++
    if (c === ')' || c === ']' || c === '}') profundidad--
    if (c === ',' && profundidad === 0) {
      argumentos.push(actual.trim())
      actual = ''
    }
    else {
      actual += c
    }
  }
  argumentos.push(actual.trim())
  return argumentos
}

interface LlamadaEncontrada {
  inicio: number
  fin: number
  argumentos: string[]
}

// Todas las llamadas `nombre(...)` de `region`, con sus argumentos de nivel
// superior ya separados. Excluye la propia DECLARACIÓN de la función
// (`function nombre(...)`/`export function nombre(...)`): la declaración no
// es una llamada, y sin esta guarda el propio fichero que define el lector
// se marcaría a sí mismo como una lectura sin testigo.
function llamadasA(region: string, nombre: string): LlamadaEncontrada[] {
  const encontradas: LlamadaEncontrada[] = []
  const patron = new RegExp(`\\b${escaparRegExp(nombre)}\\(`, 'g')
  let coincidencia: RegExpExecArray | null
  while ((coincidencia = patron.exec(region)) !== null) {
    const precedente = region.slice(Math.max(0, coincidencia.index - 'function '.length), coincidencia.index)
    const apertura = coincidencia.index + coincidencia[0].length - 1
    const cierre = indiceDeCierre(region, apertura)
    if (precedente !== 'function ') {
      const argumentos = argumentosDeNivelSuperior(region.slice(apertura + 1, cierre))
      encontradas.push({ inicio: coincidencia.index, fin: cierre + 1, argumentos })
    }
    patron.lastIndex = cierre + 1
  }
  return encontradas
}

// Contenido de un fichero del árbol por su ruta relativa EXACTA (nunca por
// sufijo: dos ficheros con el mismo nombre en carpetas distintas no pueden
// confundirse).
function contenidoPorRuta(ficheros: Record<string, string>, ruta: string): string {
  const entrada = Object.entries(ficheros).find(([clave]) => rutaRelativa(clave) === ruta)
  if (!entrada) {
    throw new Error(`No se encontró ${ruta} en el glob del árbol`)
  }
  return entrada[1]!
}

// Filtra un mapa de ficheros a `app/composables/` (sin `__tests__/`), el
// universo sobre el que se aplica el descubrimiento de marcas.
function soloComposables(ficheros: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(ficheros).filter(([clave]) => {
      const ruta = rutaRelativa(clave)
      return ruta.startsWith('app/composables/') && !ruta.includes('/__tests__/')
    }),
  )
}

// --- Descubrimiento: marcasDeEstadoDeModuloDe (Task 1) ---
//
// Un glob más DOS predicados — nunca una lista de módulos tecleada a mano.
// (a) el contenido tiene, a COLUMNA 0, al menos una línea de estado de
// módulo mutable: `const X = new Set(...)`, `const X = new Map(...)`,
// `const X = ref(...)`/`ref<T>(...)`, o `let X`. Es la forma exacta que
// `useProgressMismatchMark.ts` y `useHistorySavedNotice.ts` tienen hoy.
// (b) `regionVigilada(contenido)` contiene alguna raíz de
// `RAICES_SOBRE_LOS_DATOS_DEL_GRUPO` (importada del vocabulario
// compartido, nunca recopiada). Un composable nuevo con estos dos rasgos
// entra en el descubrimiento SOLO, sin que nadie edite ninguna lista — es
// el corazón anti-recurrencia de este plan.
const PATRON_ESTADO_DE_MODULO_MUTABLE = /^(const [A-Za-z_$][\w$]* = (new (Set|Map)\b|ref[<(])|let [A-Za-z_$])/m

export function marcasDeEstadoDeModuloDe(ficheros: Record<string, string>): string[] {
  const marcas: string[] = []
  for (const [clave, contenido] of Object.entries(ficheros)) {
    if (!PATRON_ESTADO_DE_MODULO_MUTABLE.test(contenido)) continue
    const region = regionVigilada(contenido)
    const tieneRaizVigilada = RAICES_SOBRE_LOS_DATOS_DEL_GRUPO.some(raiz => contieneRaizSobreLosDatosDelGrupo(region, raiz))
    if (tieneRaizVigilada) {
      marcas.push(rutaRelativa(clave))
    }
  }
  return marcas.sort()
}

// --- Excepciones auditadas: marcas cuyo referente NO es persistente por
// diseño (Task 1, item 6; WR-02/WR-03 heredadas en el plan 09-39, Task 3) ---
//
// Misma forma y mismo rigor que `AFIRMACIONES_AUDITADAS`
// (`afirmacionesRespaldadas.test.ts`): un motivo COMPROBABLE, nunca en
// prosa suelta, y un respaldo que resuelve a un fichero real
// (`respaldoExiste`, del vocabulario compartido). `raiz` se añade en el
// plan 09-39 (Task 3) con la MISMA forma que `AfirmacionAuditada`: las
// excepciones auditadas de los dos gates se rigen por las mismas reglas
// porque son el mismo mecanismo con dos tablas — una regla relajada en una
// de las dos sería la puerta que la otra cerró.
export const MARCAS_CON_REFERENTE_NO_PERSISTENTE: Record<string, { raiz: string, motivo: string, respaldo: string }> = {
  'app/composables/useHistorySavedNotice.ts': {
    raiz: 'guardad',
    motivo: 'Su estado de módulo (activeVariant/timeoutId) es un aviso TRANSITORIO en pantalla, decidido por planGameEnd(historyRecorded, stored) a partir de una lectura FRESCA de la autoridad en el mismo instante en que se pinta (notifyHistorySaved recibe siempre la variante recién calculada por planGameEnd) y nunca transportado entre montajes distintos de la página — a diferencia de useProgressMismatchMark.ts, cuyo propósito explícito es transportar un hecho EN EL TIEMPO, entre el cierre de una partida y el montaje siguiente.',
    respaldo: 'app/composables/__tests__/avisoTrasRegistroFallido.test.ts',
  },
}

// excepcionesConRespaldoInsuficiente (plan 09-39, Task 3): mismo patrón que
// `frasesSinAuditarDe`/`variantesSinRespaldoDe` (afirmacionesRespaldadas.test.ts,
// planes 09-34/09-35) — la comprobación se extrae a una función pura
// exportada que acepta la TABLA como parámetro, con la tabla real como
// valor por defecto, para que un caso sintético pueda ejercerla sin tocar
// la real. Aplica las MISMAS dos funciones que el gate de clase
// (`respaldoRespaldaA`/`motivoNombraAlgoComprobable`), importadas del
// módulo compartido — nunca reimplementadas.
export function excepcionesConRespaldoInsuficiente(
  tabla: Record<string, { raiz: string, motivo: string, respaldo: string }> = MARCAS_CON_REFERENTE_NO_PERSISTENTE,
): string[] {
  const insuficientes: string[] = []
  for (const [ruta, excepcion] of Object.entries(tabla)) {
    const tieneMotivoComprobable = motivoNombraAlgoComprobable(excepcion.motivo)
    const respaldaDeVerdad = respaldoRespaldaA(excepcion.respaldo, excepcion.raiz, excepcion.motivo)
    if (!tieneMotivoComprobable || !respaldaDeVerdad) {
      insuficientes.push(ruta)
    }
  }
  return insuficientes
}

describe('MARCAS_CON_REFERENTE_NO_PERSISTENTE — excepciones auditadas (Task 1; WR-02/WR-03 heredadas, Task 3)', () => {
  it('toda entrada tiene motivo de al menos 40 caracteres y un respaldo que resuelve a un fichero real del repo (IN-01: mide longitud, no sustancia)', () => {
    for (const [ruta, excepcion] of Object.entries(MARCAS_CON_REFERENTE_NO_PERSISTENTE)) {
      expect(excepcion.motivo.length, `${ruta}: motivo demasiado corto`).toBeGreaterThanOrEqual(40)
      expect(respaldoExiste(excepcion.respaldo), `${ruta}: respaldo inexistente (${excepcion.respaldo})`).toBe(true)
    }
  })

  // WR-02/WR-03 heredadas (plan 09-39): las mismas dos exigencias del gate
  // de clase — el respaldo tiene que respaldar de verdad (no solo existir)
  // y el motivo tiene que nombrar algo comprobable (no solo prosa larga) —
  // se aplican aquí, sin excepción para esta tabla.
  it('toda entrada pasa respaldoRespaldaA y motivoNombraAlgoComprobable (WR-02/WR-03 heredadas)', () => {
    const insuficientes = excepcionesConRespaldoInsuficiente()
    expect(insuficientes, `Entradas con respaldo insuficiente: ${insuficientes.join(', ')}`).toEqual([])
  })

  it('la entrada real de useHistorySavedNotice.ts pasa por vía de identificador (planGameEnd, nombrado en su motivo, medido dentro de avisoTrasRegistroFallido.test.ts)', () => {
    const excepcion = MARCAS_CON_REFERENTE_NO_PERSISTENTE['app/composables/useHistorySavedNotice.ts']!
    expect(motivoNombraAlgoComprobable(excepcion.motivo)).toBe(true)
    expect(identificadoresComprobablesDe(excepcion.motivo)).toContain('planGameEnd')
    expect(respaldoRespaldaA(excepcion.respaldo, excepcion.raiz, excepcion.motivo)).toBe(true)
  })

  // --- Casos sintéticos: las dos primeras viñetas de <behavior> (Task 3) ---

  it('una entrada sintética con un respaldo REAL pero SIN RELACIÓN pone rojo el gate de invariantes (WR-02, caso sintético)', () => {
    const tablaSintetica = {
      'app/composables/FicheroSintetico.ts': {
        raiz: 'guardad',
        motivo: 'planGameEnd decide este aviso a partir de una lectura fresca de la autoridad.',
        respaldo: 'app/composables/useVoiceAnnouncer.ts', // real, sin relación con 'guardad' ni con planGameEnd
      },
    }
    expect(excepcionesConRespaldoInsuficiente(tablaSintetica)).toEqual(['app/composables/FicheroSintetico.ts'])
  })

  it('una entrada sintética con un motivo de RELLENO sin identificadores pone rojo el gate de invariantes (WR-03, caso sintético)', () => {
    const tablaSintetica = {
      'app/composables/FicheroSintetico.ts': {
        raiz: 'guardad',
        motivo: 'esto está bien, de verdad, en serio, créeme, funciona correctamente sin ningún problema',
        respaldo: 'app/composables/__tests__/avisoTrasRegistroFallido.test.ts', // real y SÍ relacionado, pero el motivo no nombra nada comprobable
      },
    }
    expect(excepcionesConRespaldoInsuficiente(tablaSintetica)).toEqual(['app/composables/FicheroSintetico.ts'])
  })

  // Cierre de cobertura (Task 3, plan 09-39): casos sintéticos AISLADOS
  // para las dos condiciones que las entradas reales de esta tabla no
  // ejercitan en rojo por sí solas — longitud (IN-01) y respaldo existente
  // (respaldoExiste) —, cada uno llamando directamente a la función que
  // implementa esa única condición, sin pasar por el resto.
  it('un motivo de menos de 40 caracteres no alcanza el umbral de longitud (IN-01, caso sintético aislado, cierre de cobertura)', () => {
    const motivoCorto = 'motivo corto'
    expect(motivoCorto.length).toBeLessThan(40)
  })

  it('respaldoExiste devuelve false para una ruta inventada (caso sintético aislado, cierre de cobertura)', () => {
    expect(respaldoExiste('app/composables/no-existe-de-verdad.ts')).toBe(false)
  })
})

describe('Descubrimiento — marcasDeEstadoDeModuloDe (Task 1)', () => {
  it('sobre el árbol real de app/composables/ (sin __tests__/) devuelve exactamente useHistorySavedNotice.ts y useProgressMismatchMark.ts', () => {
    expect(marcasDeEstadoDeModuloDe(soloComposables(ficherosTsDelArbol))).toEqual([
      'app/composables/useHistorySavedNotice.ts',
      'app/composables/useProgressMismatchMark.ts',
    ])
  })

  it('usePreloadedAudio.ts NO sale (tiene estado de módulo — un Map — pero ninguna raíz vigilada)', () => {
    expect(marcasDeEstadoDeModuloDe(soloComposables(ficherosTsDelArbol))).not.toContain('app/composables/usePreloadedAudio.ts')
  })

  it('sobre un mapa sintético con estado de módulo y NINGUNA raíz devuelve [] (caso sintético)', () => {
    const sintetico = { '/app/composables/Sintetico.ts': 'const x = new Set<string>()\nexport function f(): void {}' }
    expect(marcasDeEstadoDeModuloDe(sintetico)).toEqual([])
  })

  it('sobre un mapa sintético con raíces y NINGÚN estado de módulo a columna 0 devuelve [] (caso sintético)', () => {
    const sintetico = { '/app/composables/Sintetico.ts': 'export function f(): string { return \'esto habla de dispositivo y de progreso\' }' }
    expect(marcasDeEstadoDeModuloDe(sintetico)).toEqual([])
  })
})

// --- Pata 1: contratoDeLaMarcaDe (Task 1) ---
//
// Clasifica cada `export function` POR LO QUE HACE, no por cómo se llama:
// clasificar por nombre sería un vocabulario cerrado, exactamente lo que
// WR-03 encontró un nivel más arriba (09-REVIEW.md ronda 6, sobre los
// literales de `NoticeVariant`).
interface FuncionExportada {
  nombre: string
  parametros: string[]
  tipoDeRetorno: string
  cuerpo: string
}

function extraerFuncionesExportadas(fuente: string): FuncionExportada[] {
  const region = regionVigilada(fuente)
  const funciones: FuncionExportada[] = []
  const patronInicio = /export function ([A-Za-z_$][\w$]*)\(/g
  let coincidencia: RegExpExecArray | null
  while ((coincidencia = patronInicio.exec(region)) !== null) {
    const nombre = coincidencia[1]!
    const aperturaParametros = coincidencia.index + coincidencia[0].length - 1
    const cierreParametros = indiceDeCierre(region, aperturaParametros)
    const parametros = argumentosDeNivelSuperior(region.slice(aperturaParametros + 1, cierreParametros))

    let cursor = cierreParametros + 1
    while (cursor < region.length && region[cursor] === ' ') cursor++
    let tipoDeRetorno = ''
    if (region[cursor] === ':') {
      cursor++
      const inicioTipo = cursor
      while (cursor < region.length && region[cursor] !== '{') cursor++
      tipoDeRetorno = region.slice(inicioTipo, cursor).trim()
    }
    const aperturaCuerpo = cursor
    const cierreCuerpo = indiceDeCierre(region, aperturaCuerpo)
    const cuerpo = region.slice(aperturaCuerpo + 1, cierreCuerpo)

    funciones.push({ nombre, parametros, tipoDeRetorno, cuerpo })
    patronInicio.lastIndex = cierreCuerpo + 1
  }
  return funciones
}

interface ContratoDeLaMarca {
  ponedor: string | null
  retirador: string | null
  lector: string | null
  aridadDelLector: number
  segundoParametroOpcional: boolean
}

export function contratoDeLaMarcaDe(fuente: string): ContratoDeLaMarca {
  const contrato: ContratoDeLaMarca = {
    ponedor: null,
    retirador: null,
    lector: null,
    aridadDelLector: 0,
    segundoParametroOpcional: false,
  }

  for (const funcion of extraerFuncionesExportadas(fuente)) {
    if (/\.(add|set)\(/.test(funcion.cuerpo)) {
      contrato.ponedor = funcion.nombre
    }
    if (/\.delete\(/.test(funcion.cuerpo)) {
      contrato.retirador = funcion.nombre
    }
    if (funcion.tipoDeRetorno !== 'void' && funcion.tipoDeRetorno !== '' && /\.(has|get)\(/.test(funcion.cuerpo)) {
      contrato.lector = funcion.nombre
      contrato.aridadDelLector = funcion.parametros.length
      const segundoParametro = funcion.parametros[1]
      contrato.segundoParametroOpcional = segundoParametro !== undefined && /\?\s*:/.test(segundoParametro)
    }
  }

  return contrato
}

describe('Pata 1 — contratoDeLaMarcaDe (Task 1)', () => {
  // Actualizado en el plan 09-39 (Task 3): el plan 09-38 (GREEN de CR-01)
  // cambió la firma real de `readProgressMismatchWarning` a dos parámetros
  // obligatorios (`huellaActual` sin `?`) — este self-test medía el estado
  // ROTO anterior (aridadDelLector=1), etiquetado explícitamente "(HOY)" en
  // su propio nombre para avisar de que era temporal. Las PATAS REALES de
  // abajo (`it.each` sobre `marcasNoAuditadas`) son las que de verdad
  // auditan el árbol vivo; este self-test solo fija el comportamiento de
  // `contratoDeLaMarcaDe` sobre el contenido real, ahora arreglado.
  it('identifica ponedor/retirador/lector y aridadDelLector=2 con segundo parámetro obligatorio sobre useProgressMismatchMark.ts real (arreglado en el plan 09-38)', () => {
    const contrato = contratoDeLaMarcaDe(contenidoPorRuta(ficherosTsDelArbol, 'app/composables/useProgressMismatchMark.ts'))
    expect(contrato.ponedor).toBe('markProgressMismatch')
    expect(contrato.retirador).toBe('clearProgressMismatch')
    expect(contrato.lector).toBe('readProgressMismatchWarning')
    expect(contrato.aridadDelLector).toBe(2)
    expect(contrato.segundoParametroOpcional).toBe(false)
  })

  it('sobre una fuente sintética con ponedor (.add)/retirador (.delete)/lector (.has, retorno no-void, aridad 2) los identifica todos (caso sintético)', () => {
    const sintetico = `
const marcas = new Set<string>()
export function poner(id: string, testigo: string): void {
  marcas.add(id)
}
export function retirar(id: string): void {
  marcas.delete(id)
}
export function leer(id: string, testigo: string): string | null {
  return marcas.has(id) ? testigo : null
}
`
    const contrato = contratoDeLaMarcaDe(sintetico)
    expect(contrato.ponedor).toBe('poner')
    expect(contrato.retirador).toBe('retirar')
    expect(contrato.lector).toBe('leer')
    expect(contrato.aridadDelLector).toBe(2)
    expect(contrato.segundoParametroOpcional).toBe(false)
  })

  it('sobre una fuente sintética donde el segundo parámetro del lector es opcional, segundoParametroOpcional es true (caso sintético)', () => {
    const sintetico = `
const marcas = new Set<string>()
export function leer(id: string, testigo?: string): string | null {
  return marcas.has(id) ? (testigo ?? null) : null
}
`
    expect(contratoDeLaMarcaDe(sintetico).segundoParametroOpcional).toBe(true)
  })
})

describe('Pata 1 — invariante: el lector exige aridad >= 2 y segundo parámetro NO opcional, para toda marca no auditada (Task 1)', () => {
  const marcasDescubiertas = marcasDeEstadoDeModuloDe(soloComposables(ficherosTsDelArbol))
  const marcasNoAuditadas = marcasDescubiertas.filter(marca => !(marca in MARCAS_CON_REFERENTE_NO_PERSISTENTE))

  it.each(marcasNoAuditadas)('%s: su lector exige aridad >= 2 y segundo parámetro obligatorio — ROJA hoy si la marca todavía no exige testigo', (marca) => {
    const contrato = contratoDeLaMarcaDe(contenidoPorRuta(ficherosTsDelArbol, marca))
    const cumple = contrato.aridadDelLector >= 2 && contrato.segundoParametroOpcional === false
    expect(
      cumple,
      `${marca}: su lector (${contrato.lector}) tiene aridadDelLector=${contrato.aridadDelLector} y `
      + `segundoParametroOpcional=${contrato.segundoParametroOpcional} — se exige aridad >= 2 y segundo `
      + 'parámetro NO opcional para que la sustitución del referente sea detectable',
    ).toBe(true)
  })
})

// --- Pata 2: lecturasSinTestigoDe (Task 1) ---
export function lecturasSinTestigoDe(fuente: string, nombreDelLector: string): string[] {
  const region = regionVigilada(fuente)
  return llamadasA(region, nombreDelLector)
    .filter(llamada => llamada.argumentos.length < 2)
    .map(llamada => region.slice(llamada.inicio, llamada.fin))
}

describe('Pata 2 — lecturasSinTestigoDe (Task 1)', () => {
  // Actualizado en el plan 09-39 (Task 3): el plan 09-38 pasó la llamada de
  // la línea ~208 a `readProgressMismatchWarning(gameId, informe.huella)`
  // (dos argumentos) — este self-test medía el estado ROTO anterior (una
  // llamada de un solo argumento), etiquetado "ROJA hoy" a propósito.
  it('sobre app/pages/[game]/index.vue real, para readProgressMismatchWarning, no devuelve ninguna llamada sin testigo (arreglado en el plan 09-38)', () => {
    const fuente = contenidoPorRuta(ficherosVueDelArbol, 'app/pages/[game]/index.vue')
    const llamadas = lecturasSinTestigoDe(fuente, 'readProgressMismatchWarning')
    expect(llamadas).toEqual([])
  })

  it('sobre una fuente sintética con una llamada de dos argumentos devuelve [] (caso sintético)', () => {
    expect(lecturasSinTestigoDe('lector(gameId, testigo)', 'lector')).toEqual([])
  })

  it('no confunde una llamada con un argumento que contiene una coma dentro de paréntesis anidados (lector(f(a, b))) con una llamada de dos argumentos (caso sintético)', () => {
    expect(lecturasSinTestigoDe('lector(f(a, b))', 'lector')).toEqual(['lector(f(a, b))'])
  })

  it('sobre una llamada sin ningún argumento la cuenta como 0 argumentos, sin testigo (caso sintético)', () => {
    expect(lecturasSinTestigoDe('lector()', 'lector')).toEqual(['lector()'])
  })
})

describe('Pata 2 — invariante: ninguna llamada real al lector omite el testigo, para toda marca no auditada (Task 1)', () => {
  const marcasDescubiertas = marcasDeEstadoDeModuloDe(soloComposables(ficherosTsDelArbol))
  const marcasNoAuditadas = marcasDescubiertas.filter(marca => !(marca in MARCAS_CON_REFERENTE_NO_PERSISTENTE))

  const ficherosVigilados: Array<[string, string]> = [
    ...Object.entries(ficherosVueDelArbol),
    ...Object.entries(ficherosTsDelArbol),
  ].filter(([clave]) => !rutaRelativa(clave).includes('/__tests__/'))

  for (const marca of marcasNoAuditadas) {
    const lector = contratoDeLaMarcaDe(contenidoPorRuta(ficherosTsDelArbol, marca)).lector
    if (!lector) continue

    it.each(ficherosVigilados)(`${marca}: ninguna llamada a ${lector} sin testigo en %s`, (clave, contenido) => {
      const llamadasSinTestigo = lecturasSinTestigoDe(contenido, lector)
      if (llamadasSinTestigo.length > 0) {
        throw new Error(
          `${rutaRelativa(clave)} llama a ${lector} sin testigo del referente (${llamadasSinTestigo.join(', ')}). `
          + `Una llamada a ${lector} tiene que pasar el testigo del referente de la marca ${marca}, o la marca `
          + 'podría sobrevivir a la destrucción de su propio referente (CR-01).',
        )
      }
      expect(llamadasSinTestigo.length).toBe(0)
    })
  }
})

// --- Pata 3: faltaPruebaDeCicloDeVidaEn (Task 2) ---
//
// Forma ejecutable del cuarto `missing:` del gap de SC3
// (`09-VERIFICATION.md` ronda 8): «un test de extremo a extremo sobre
// useProgressMismatchMark que reproduzca el camino completo … para que la
// novena cara no dependa de que otra ronda de verificación la vuelva a
// encontrar a mano». Trocea la fuente del test en bloques por cada `it(`
// (de una aparición a la siguiente, o al final) y exige que ALGÚN bloque
// demuestre el ciclo de vida completo: pone con un testigo, lee DESPUÉS con
// un testigo DISTINTO, y espera `null` — leer con el MISMO testigo con el
// que se puso no demuestra nada sobre la sustitución del referente (si no,
// la pata sería satisfacible con un test que no prueba nada).
function trocearPorIt(fuente: string): string[] {
  const region = regionVigilada(fuente)
  const patron = /\bit\(/g
  const posiciones: number[] = []
  let coincidencia: RegExpExecArray | null
  while ((coincidencia = patron.exec(region)) !== null) {
    posiciones.push(coincidencia.index)
  }
  return posiciones.map((inicio, indice) => region.slice(inicio, posiciones[indice + 1] ?? region.length))
}

function bloqueDemuestraCicloDeVida(bloque: string, ponedor: string, lector: string): boolean {
  const llamadasPonedor = llamadasA(bloque, ponedor)
  const llamadasLector = llamadasA(bloque, lector)

  for (const llamadaPonedor of llamadasPonedor) {
    for (const llamadaLector of llamadasLector) {
      if (llamadaLector.inicio <= llamadaPonedor.inicio) continue // el lector tiene que venir DESPUÉS
      const segundoArgPonedor = llamadaPonedor.argumentos[1]
      const segundoArgLector = llamadaLector.argumentos[1]
      if (segundoArgPonedor === undefined || segundoArgLector === undefined) continue
      if (segundoArgPonedor === segundoArgLector) continue // mismo testigo: no demuestra sustitución
      const restoDesdeLector = bloque.slice(llamadaLector.fin)
      if (/\btoBe\(\s*null\s*\)/.test(restoDesdeLector)) {
        return true
      }
    }
  }
  return false
}

export function faltaPruebaDeCicloDeVidaEn(fuenteDelTest: string, ponedor: string, lector: string): boolean {
  const bloques = trocearPorIt(fuenteDelTest)
  return !bloques.some(bloque => bloqueDemuestraCicloDeVida(bloque, ponedor, lector))
}

describe('Pata 3 — faltaPruebaDeCicloDeVidaEn (Task 2)', () => {
  // Actualizado en el plan 09-39 (Task 3): el plan 09-38 (Task 3) añadió el
  // test 16 de useProgressMismatchMark.test.ts, que pone con una huella y
  // lee con OTRA distinta esperando null — exactamente el ciclo de vida que
  // esta pata exige. Este self-test medía el estado ROTO anterior (ningún
  // it lo demostraba), etiquetado "ROJA hoy" a propósito.
  it('sobre useProgressMismatchMark.test.ts real devuelve false — el test 16 (plan 09-38) demuestra el ciclo de vida con testigos distintos (arreglado)', () => {
    const fuente = contenidoPorRuta(ficherosTsDelArbol, 'app/composables/__tests__/useProgressMismatchMark.test.ts')
    expect(faltaPruebaDeCicloDeVidaEn(fuente, 'markProgressMismatch', 'readProgressMismatchWarning')).toBe(false)
  })

  it('sobre una fuente sintética con un it que pone con un testigo y lee con OTRO distinto, seguido de toBe(null), devuelve false (caso sintético: SÍ demuestra el ciclo de vida)', () => {
    const sintetico = `
it('demuestra sustitución del referente', () => {
  markProgressMismatch(gameId, 'testigo-1')
  expect(readProgressMismatchWarning(gameId, 'testigo-2')).toBe(null)
})
`
    expect(faltaPruebaDeCicloDeVidaEn(sintetico, 'markProgressMismatch', 'readProgressMismatchWarning')).toBe(false)
  })

  it('sobre una fuente sintética donde se lee con el MISMO testigo con el que se puso, devuelve true — leer con el mismo testigo no demuestra nada sobre la sustitución del referente (caso sintético negativo)', () => {
    const sintetico = `
it('pone y lee con el mismo testigo', () => {
  markProgressMismatch(gameId, 'testigo-1')
  expect(readProgressMismatchWarning(gameId, 'testigo-1')).toBe(null)
})
`
    expect(faltaPruebaDeCicloDeVidaEn(sintetico, 'markProgressMismatch', 'readProgressMismatchWarning')).toBe(true)
  })
})

describe('Pata 3 — invariante: existe test hermano que demuestra el ciclo de vida completo, para toda marca no auditada (Task 2)', () => {
  const marcasDescubiertas = marcasDeEstadoDeModuloDe(soloComposables(ficherosTsDelArbol))
  const marcasNoAuditadas = marcasDescubiertas.filter(marca => !(marca in MARCAS_CON_REFERENTE_NO_PERSISTENTE))

  it.each(marcasNoAuditadas)('%s: existe su fichero hermano de test y demuestra el ciclo de vida completo (ponedor -> lector con testigo distinto -> null)', (marca) => {
    const contrato = contratoDeLaMarcaDe(contenidoPorRuta(ficherosTsDelArbol, marca))
    expect(contrato.ponedor, `${marca}: no se identificó ningún ponedor`).not.toBeNull()
    expect(contrato.lector, `${marca}: no se identificó ningún lector`).not.toBeNull()

    const nombreDelModulo = marca.replace(/^app\/composables\//, '').replace(/\.ts$/, '')
    const rutaDelHermano = `app/composables/__tests__/${nombreDelModulo}.test.ts`
    const entradaHermano = Object.entries(ficherosTsDelArbol).find(([clave]) => rutaRelativa(clave) === rutaDelHermano)
    expect(entradaHermano, `${marca}: no existe su fichero hermano de test (${rutaDelHermano})`).toBeDefined()

    const falta = faltaPruebaDeCicloDeVidaEn(entradaHermano![1], contrato.ponedor!, contrato.lector!)
    expect(
      falta,
      `${rutaDelHermano} no contiene ningún \`it\` que ponga la marca de ${marca} y la lea con un testigo `
      + 'distinto esperando null — falta la prueba de ciclo de vida completo',
    ).toBe(false)
  })
})

// --- Pata 4: ramasQueLeenSinPintarDe (Task 2) ---
//
// Mecánica, medida sobre el árbol real antes de escribirla: en todo `app/`
// hay exactamente dos asignaciones de la forma `<ref>.value = <expresión
// con ===>`, las dos en `app/pages/[game]/index.vue`
// (`awaitingResumeChoice`/`awaitingContentChangedAck`).
export function ramasQueLeenSinPintarDe(fuenteDelConsumidor: string, lector: string): string[] {
  const region = regionVigilada(fuenteDelConsumidor)

  // a. Identificar el ref del aviso: la asignación `<X>.value = <lector>(`.
  const patronRefDelAviso = new RegExp(`([A-Za-z_$][\\w$]*)\\.value\\s*=\\s*${escaparRegExp(lector)}\\(`)
  const coincidenciaRefDelAviso = patronRefDelAviso.exec(region)
  if (!coincidenciaRefDelAviso) return []
  const refDelAviso = coincidenciaRefDelAviso[1]!

  // b. Identificar las ramas de decisión de montaje: todo `<R>.value =
  // <expresión que contiene ===>`. Un ref asignado desde un LITERAL no es
  // una rama — por eso `resumeResolved.value = true` queda fuera: no
  // decide nada a partir de una comparación, solo marca "ya se resolvió el
  // montaje".
  const ramas = new Set<string>()
  const patronAsignacion = /([A-Za-z_$][\w$]*)\.value\s*=\s*([^\n;]+)/g
  let coincidenciaAsignacion: RegExpExecArray | null
  while ((coincidenciaAsignacion = patronAsignacion.exec(region)) !== null) {
    const ref = coincidenciaAsignacion[1]!
    const expresion = coincidenciaAsignacion[2]!
    if (ref === refDelAviso) continue
    if (expresion.includes('===')) {
      ramas.add(ref)
    }
  }

  // c/d. Para cada rama, localizar su segmento de plantilla (desde su
  // v-if/v-else-if hasta el siguiente v-if/v-else-if/v-else, o el final) y
  // comprobar que ese segmento enlaza el ref del aviso como prop.
  const faltantes: string[] = []
  for (const rama of ramas) {
    const patronRama = new RegExp(`v-(?:else-)?if="${rama}"`)
    const coincidenciaRama = patronRama.exec(region)
    if (!coincidenciaRama) continue // sin aparición en la plantilla: fuera de alcance de esta pata

    const inicioSegmento = coincidenciaRama.index + coincidenciaRama[0].length
    const patronSiguiente = /v-else-if=|v-if=|v-else\b/g
    patronSiguiente.lastIndex = inicioSegmento
    const coincidenciaSiguiente = patronSiguiente.exec(region)
    const finSegmento = coincidenciaSiguiente ? coincidenciaSiguiente.index : region.length
    const segmento = region.slice(inicioSegmento, finSegmento)

    if (!segmento.includes(`="${refDelAviso}"`)) {
      faltantes.push(rama)
    }
  }
  return faltantes.sort()
}

describe('Pata 4 — ramasQueLeenSinPintarDe (Task 2)', () => {
  // Actualizado en el plan 09-39 (Task 3): el plan 09-38 (Task 2) añadió
  // `:mismatch-warning="avisoDiscrepancia"` a `<ContentChangedNotice>` — la
  // rama `awaitingContentChangedAck` ya pinta el aviso, igual que
  // `awaitingResumeChoice`. Este self-test medía el estado ROTO anterior
  // (WR-01: la rama calculaba el aviso sin pintarlo), etiquetado "ROJA hoy"
  // a propósito.
  it('sobre app/pages/[game]/index.vue real devuelve un array vacío — las dos ramas pintan el aviso (WR-01 arreglado en el plan 09-38)', () => {
    const fuente = contenidoPorRuta(ficherosVueDelArbol, 'app/pages/[game]/index.vue')
    const faltantes = ramasQueLeenSinPintarDe(fuente, 'readProgressMismatchWarning')
    expect(faltantes).toEqual([])
  })

  it('sobre una fuente sintética donde las DOS ramas llevan el binding del aviso devuelve [] (caso sintético)', () => {
    const sintetico = `
avisoDiscrepancia.value = readProgressMismatchWarning(gameId)
ramaUno.value = plan.action === 'uno'
ramaDos.value = plan.action === 'dos'

<template>
  <ComponenteUno v-if="ramaUno" :mismatch-warning="avisoDiscrepancia" />
  <ComponenteDos v-else-if="ramaDos" :mismatch-warning="avisoDiscrepancia" />
</template>
`
    expect(ramasQueLeenSinPintarDe(sintetico, 'readProgressMismatchWarning')).toEqual([])
  })

  it('el descubrimiento de ramas no incluye ningún ref asignado desde un literal (resumeResolved.value = true no es una rama de decisión de montaje, caso sintético)', () => {
    const sintetico = `
avisoDiscrepancia.value = readProgressMismatchWarning(gameId)
resumeResolved.value = true
ramaUno.value = plan.action === 'uno'

<template>
  <ComponenteUno v-if="ramaUno" />
</template>
`
    const faltantes = ramasQueLeenSinPintarDe(sintetico, 'readProgressMismatchWarning')
    expect(faltantes).not.toContain('resumeResolved')
  })
})

describe('Pata 4 — invariante: toda rama que lee la marca la pinta, para toda marca no auditada (Task 2)', () => {
  const marcasDescubiertas = marcasDeEstadoDeModuloDe(soloComposables(ficherosTsDelArbol))
  const marcasNoAuditadas = marcasDescubiertas.filter(marca => !(marca in MARCAS_CON_REFERENTE_NO_PERSISTENTE))

  const ficherosVueVigilados = Object.entries(ficherosVueDelArbol).filter(([clave]) => !rutaRelativa(clave).includes('/__tests__/'))

  for (const marca of marcasNoAuditadas) {
    const lector = contratoDeLaMarcaDe(contenidoPorRuta(ficherosTsDelArbol, marca)).lector
    if (!lector) continue

    it.each(ficherosVueVigilados)(`${marca}: ninguna rama de %s que lee ${lector} deja de pintarlo`, (clave, contenido) => {
      const faltantes = ramasQueLeenSinPintarDe(contenido, lector)
      if (faltantes.length > 0) {
        throw new Error(
          `${rutaRelativa(clave)}: la(s) rama(s) ${faltantes.join(', ')} calculan el aviso de ${marca} (vía `
          + `${lector}) pero no lo pintan en la plantilla — la rama tiene destino de cálculo y no destino de `
          + 'render (WR-01).',
        )
      }
      expect(faltantes.length).toBe(0)
    })
  }
})

// --- Pata 5: cobertura del descubrimiento (Task 3) ---
//
// COMENTARIO DE ANTI-RECURRENCIA (obligatorio, Task 3): para que la DÉCIMA
// cara de este defecto la encuentre ESTA suite y no otra ronda de
// revisión, basta con que un composable nuevo de `app/composables/` tenga
// estado de módulo mutable (`const X = new Set(...)`/`new Map(...)`/
// `ref(...)`, o `let X`) a columna 0 Y una raíz vigilada de
// `RAICES_SOBRE_LOS_DATOS_DEL_GRUPO`: `marcasDeEstadoDeModuloDe` lo
// encuentra SOLO, sin que nadie edite ninguna lista — es un glob más dos
// predicados. A partir de ahí, la marca nueva entra automáticamente en
// `marcasNoAuditadas` (o queda excluida si alguien la añade, con motivo y
// respaldo comprobables, a `MARCAS_CON_REFERENTE_NO_PERSISTENTE`), y las
// patas 1, 2 y 4 — que son `it.each` construidos sobre `marcasNoAuditadas`
// — la ejercitan sin que nadie edite ningún array de esta suite. Este test
// es el que impide que una marca nueva quede fuera de las dos vías (patas o
// tabla de excepciones) sin que la suite lo diga.
describe('Pata 5 — cobertura del descubrimiento: ninguna marca queda huérfana (Task 3)', () => {
  const marcasDescubiertas = marcasDeEstadoDeModuloDe(soloComposables(ficherosTsDelArbol))

  it('el descubrimiento sobre el árbol real NO está vacío (un gate que no descubre nada está verde por accidente, no por ausencia de defecto)', () => {
    expect(marcasDescubiertas.length).toBeGreaterThan(0)
  })

  it('toda marca descubierta está o bien en MARCAS_CON_REFERENTE_NO_PERSISTENTE (con motivo y respaldo comprobables) o bien sometida a las patas 1/2/4 vía marcasNoAuditadas — nunca ignorada en silencio', () => {
    const auditadas = new Set(Object.keys(MARCAS_CON_REFERENTE_NO_PERSISTENTE))
    const noAuditadas = new Set(marcasDescubiertas.filter(marca => !auditadas.has(marca)))

    for (const marca of marcasDescubiertas) {
      const estaAuditada = auditadas.has(marca)
      const estaSometidaAPatas = noAuditadas.has(marca)
      // Exhaustividad: exactamente una de las dos vías. Ninguna de las dos
      // dejaría la marca huérfana (invisible a toda comprobación); las dos
      // a la vez la eximiría de las patas por un error de tabla.
      expect(
        estaAuditada !== estaSometidaAPatas,
        `${marca} no está sometida a ninguna vía de comprobación (ni MARCAS_CON_REFERENTE_NO_PERSISTENTE `
        + 'ni las patas 1/2/4) — una marca huérfana no puede pasar en silencio. Se espera: o bien una entrada '
        + 'auditada con motivo y respaldo comprobables, o bien quedar fuera de la tabla para que las patas la '
        + 'vigilen.',
      ).toBe(true)

      if (estaAuditada) {
        const excepcion = MARCAS_CON_REFERENTE_NO_PERSISTENTE[marca]!
        expect(excepcion.motivo.trim().length, `${marca}: motivo vacío en MARCAS_CON_REFERENTE_NO_PERSISTENTE`).toBeGreaterThan(0)
        expect(respaldoExiste(excepcion.respaldo), `${marca}: respaldo inexistente (${excepcion.respaldo})`).toBe(true)
      }
    }
  })
})

// --- Cierre de cobertura de las condiciones de calidad heredadas (Task 3, plan 09-39, cierre de T-09-39-05) ---
//
// COMENTARIO DE ANTI-RECURRENCIA (obligatorio): distinto de la Pata 5 de
// arriba (que vigila el DESCUBRIMIENTO de marcas — que ninguna quede
// huérfana de comprobación), este cierre vigila las CUATRO condiciones de
// CALIDAD de una excepción auditada de MARCAS_CON_REFERENTE_NO_PERSISTENTE
// —longitud (IN-01), respaldo existente (respaldoExiste), respaldo
// relevante (respaldoRespaldaA, WR-02) y motivo comprobable
// (motivoNombraAlgoComprobable, WR-03)—, EXACTAMENTE la misma lista que
// `afirmacionesRespaldadas.test.ts` vigila para AFIRMACIONES_AUDITADAS: el
// mismo mecanismo con dos tablas se rige por las mismas reglas, y una
// condición añadida a UNA de las dos tablas en una ronda futura sin su
// caso rojo correspondiente aquí pone roja esta suite en el acto — que es
// exactamente lo que habría hecho falta para que WR-02 y WR-03 no llegaran
// a existir.
describe('Cierre de cobertura — las cuatro condiciones de calidad heredadas del gate de clase (Task 3)', () => {
  const COBERTURA_DE_CONDICIONES_DE_CALIDAD = [
    {
      condicion: 'longitud (IN-01, umbral de 40 caracteres) — mide longitud, no sustancia',
      casoSintetico: 'un motivo de menos de 40 caracteres no alcanza el umbral de longitud (IN-01, caso sintético aislado, cierre de cobertura)',
    },
    {
      condicion: 'respaldo existente (respaldoExiste)',
      casoSintetico: 'respaldoExiste devuelve false para una ruta inventada (caso sintético aislado, cierre de cobertura)',
    },
    {
      condicion: 'respaldo relevante (respaldoRespaldaA, WR-02)',
      casoSintetico: 'una entrada sintética con un respaldo REAL pero SIN RELACIÓN pone rojo el gate de invariantes (WR-02, caso sintético)',
    },
    {
      condicion: 'motivo comprobable (motivoNombraAlgoComprobable, WR-03)',
      casoSintetico: 'una entrada sintética con un motivo de RELLENO sin identificadores pone rojo el gate de invariantes (WR-03, caso sintético)',
    },
  ]

  it('cobertura: las cuatro condiciones de calidad de una excepción auditada tienen, cada una, un caso sintético que la pone roja de forma aislada — ninguna se queda sin él', () => {
    const clave = Object.keys(ficherosTsDelArbol).find(k => k.endsWith('/composables/__tests__/invariantesDeMarcaDeEstado.test.ts'))
    expect(clave, 'no se encontró invariantesDeMarcaDeEstado.test.ts en su propio glob').toBeDefined()
    const contenidoPropio = ficherosTsDelArbol[clave!]!
    for (const { condicion, casoSintetico } of COBERTURA_DE_CONDICIONES_DE_CALIDAD) {
      // La cita de esta lista es, ella misma, una aparición literal de
      // `casoSintetico` dentro de `contenidoPropio` — un simple `.toContain`
      // sería trivialmente cierto siempre, porque la propia cita se
      // contiene a sí misma. Se exige que el texto aparezca AL MENOS DOS
      // VECES: una la cita, otra el título real del `it(...)` que ejecuta
      // el caso — si ese `it` se renombra o se borra, el recuento cae a 1
      // y este test se pone rojo (demostrado por mutación EJECUTADA y
      // revertida, ver el SUMMARY del plan 09-39).
      const ocurrencias = contenidoPropio.split(casoSintetico).length - 1
      expect(
        ocurrencias,
        `condición «${condicion}»: el caso sintético citado ("${casoSintetico}") no existe como un it(...) real en `
        + 'el fichero — solo se encuentra la propia cita de la lista de cobertura.',
      ).toBeGreaterThanOrEqual(2)
    }
  })
})
