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
//   `regionVigilada`, no solo el `<template>`).
// - Gate B: la copy del composable (`NOTICE_BODY`) solo afirma desde
//   variantes que la autoridad puede producir, y esas variantes cubren
//   EXACTAMENTE los valores de `StoredProgress`, sin hueco ni solape.
// - Gate C: nadie fuera de los ficheros que conocen la autoridad se inventa
//   el estado del dispositivo con un literal o una comparación propia.
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

// Los tres valores de `StoredProgress`, escritos como constante del test —
// nunca se inventa un cuarto ni se deduce de otro sitio.
const TODOS_LOS_ESTADOS_DEL_DISPOSITIVO: StoredProgress[] = ['resumable', 'absent', 'unknown']

// Criterio de inclusión de `09-AUDIT-AFIRMACIONES-UI.md` §1, hecho literal:
// cualquier fragmento de estas frases, en un `<template>` o en `NOTICE_BODY`,
// es una afirmación sobre los datos persistidos del grupo.
const FRASES_SOBRE_LOS_DATOS_DEL_GRUPO = [
  'en el dispositivo',
  'sigue guardada',
  'nada que reintentar',
  'no se ha perdido',
  'se ha guardado',
  'se han guardado',
]

// Excepciones auditadas a mano: arranca VACÍO a propósito. Si algún día hace
// falta una frase legítima fuera de las variantes respaldadas, se añade AQUÍ
// con el motivo escrito al lado — nunca en silencio.
const FICHEROS_CON_AFIRMACION_AUDITADA: string[] = []

// Las tres variantes que SÍ pueden afirmar algo sobre el dispositivo, porque
// las tres solo se alcanzan pasando por `readStoredProgress`
// (`resolveNoticeVariant`/`planGameEnd`). `success` no está aquí a
// propósito: su cuerpo es `null` (ver Gate B más abajo).
const VARIANTES_RESPALDADAS_POR_LA_AUTORIDAD = ['failure-recoverable', 'failure-unrecoverable', 'failure-unknown']

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
// para que `FICHEROS_CON_AFIRMACION_AUDITADA`/`FICHEROS_QUE_PUEDEN_NOMBRAR_EL_ESTADO_DEL_DISPOSITIVO`
// se escriban con la misma forma que el resto del repo usa al citar un fichero.
function rutaRelativa(clave: string): string {
  return clave.replace(/^\/+/, '')
}

// Recorrido RECURSIVO — nunca una lista tecleada a mano: añadir una pantalla
// nueva no puede dejarla fuera del barrido. Módulo-scope (no dentro del
// `describe` de Gate A) para que Gate S (auto-verificación) pueda usar el
// mismo glob al comprobar la cobertura sobre el árbol real, en vez de leer
// una ruta tecleada a mano.
const ficherosVueGateA = import.meta.glob('/app/**/*.vue', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

describe('Gate A — ningún .vue ni .ts de app/ afirma nada por su cuenta (09-26/09-30)', () => {
  it('barre al menos un fichero .vue real (el gate no está vacío por accidente)', () => {
    expect(Object.keys(ficherosVueGateA).length).toBeGreaterThan(0)
  })

  it.each(Object.entries(ficherosVueGateA))('%s no afirma nada sobre los datos del grupo en su plantilla o en su <script setup> sin auditoría', (clave, contenido) => {
    const ruta = rutaRelativa(clave)
    const region = regionVigilada(contenido)
    const frasesEncontradas = FRASES_SOBRE_LOS_DATOS_DEL_GRUPO.filter(frase => region.includes(frase))

    if (frasesEncontradas.length > 0 && !FICHEROS_CON_AFIRMACION_AUDITADA.includes(ruta)) {
      throw new Error(
        `${ruta} afirma en su plantilla o en su <script setup> sobre los datos guardados del grupo `
        + `(${frasesEncontradas.join(', ')}) sin pasar por la autoridad. Si hace falta una frase nueva sobre `
        + 'los datos guardados del grupo, tiene que venir de una variante respaldada por readStoredProgress '
        + '(useHistorySavedNotice.ts), no escrita directamente en la plantilla o en el script.',
      )
    }

    expect(frasesEncontradas.length === 0 || FICHEROS_CON_AFIRMACION_AUDITADA.includes(ruta)).toBe(true)
  })
})

describe('Gate B — la copy del composable solo afirma desde variantes respaldadas por la autoridad (09-26)', () => {
  it('toda entrada de NOTICE_BODY que afirme algo sobre los datos del grupo tiene una variante respaldada por la autoridad', () => {
    for (const [variante, cuerpo] of Object.entries(NOTICE_BODY)) {
      const frasesEncontradas = cuerpo === null ? [] : FRASES_SOBRE_LOS_DATOS_DEL_GRUPO.filter(frase => cuerpo.includes(frase))
      if (frasesEncontradas.length > 0) {
        expect(VARIANTES_RESPALDADAS_POR_LA_AUTORIDAD).toContain(variante)
      }
    }
  })

  it('las tres variantes respaldadas cubren EXACTAMENTE los tres valores de StoredProgress, sin hueco ni solape', () => {
    const variantesProducidas = TODOS_LOS_ESTADOS_DEL_DISPOSITIVO.map(stored => resolveNoticeVariant(false, stored))
    // Biyección: mismo tamaño tras quitar duplicados, y el mismo conjunto.
    expect(new Set(variantesProducidas).size).toBe(TODOS_LOS_ESTADOS_DEL_DISPOSITIVO.length)
    expect([...variantesProducidas].sort()).toEqual([...VARIANTES_RESPALDADAS_POR_LA_AUTORIDAD].sort())
  })

  it('resolveNoticeVariant(true, s) es success para los tres valores de StoredProgress', () => {
    for (const stored of TODOS_LOS_ESTADOS_DEL_DISPOSITIVO) {
      expect(resolveNoticeVariant(true, stored)).toBe('success')
    }
  })
})

describe('Gate C — procedencia del estado del dispositivo (09-26)', () => {
  const ficherosTs = import.meta.glob('/app/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  const ficherosVue = import.meta.glob('/app/**/*.vue', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  const todosLosFicheros: Record<string, string> = { ...ficherosTs, ...ficherosVue }

  // Fuera del alcance del gate: los propios tests (incluido este fichero),
  // que SÍ necesitan nombrar los tres valores para construir su tabla de
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

  it('los literales \'resumable\', \'absent\' y \'unknown\' solo aparecen en los ficheros que conocen la autoridad', () => {
    const LITERALES = ['\'resumable\'', '\'absent\'', '\'unknown\'']
    for (const [clave, contenido] of ficherosVigilados()) {
      const ruta = rutaRelativa(clave)
      const contieneLiteral = LITERALES.some(literal => contenido.includes(literal))
      if (contieneLiteral && !FICHEROS_QUE_PUEDEN_NOMBRAR_EL_ESTADO_DEL_DISPOSITIVO.includes(ruta)) {
        throw new Error(
          `${ruta} nombra el estado del dispositivo ('resumable'/'absent'/'unknown') sin ser uno de los `
          + 'ficheros que conocen la autoridad. Quien escribe aquí el estado del dispositivo se lo está '
          + 'inventando en vez de preguntárselo a readStoredProgress.',
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
    for (const [clave, contenido] of ficherosVigilados()) {
      const ruta = rutaRelativa(clave)
      if (patronComparacion.test(contenido) && !FICHEROS_QUE_PUEDEN_NOMBRAR_EL_ESTADO_DEL_DISPOSITIVO.includes(ruta)) {
        throw new Error(
          `${ruta} compara \`stored === '...'\` sin ser uno de los ficheros que conocen la autoridad. `
          + 'Quien escribe aquí el estado del dispositivo se lo está inventando en vez de preguntárselo '
          + 'a readStoredProgress.',
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
    const frase = FRASES_SOBRE_LOS_DATOS_DEL_GRUPO[0]!
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
    const frase = FRASES_SOBRE_LOS_DATOS_DEL_GRUPO[0]!
    const sfcSintetico = `
<template>
  <!-- ${frase} -->
  <p>hola</p>
</template>
`
    expect(regionVigilada(sfcSintetico)).not.toContain(frase)
  })

  it('una frase dentro de un comentario de línea JS de un <script setup> NO entra en la región vigilada', () => {
    const frase = FRASES_SOBRE_LOS_DATOS_DEL_GRUPO[0]!
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
    const frase = FRASES_SOBRE_LOS_DATOS_DEL_GRUPO[0]!
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
    const frase = FRASES_SOBRE_LOS_DATOS_DEL_GRUPO[0]!
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
