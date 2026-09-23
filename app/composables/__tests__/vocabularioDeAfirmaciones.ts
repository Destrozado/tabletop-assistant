// app/composables/__tests__/vocabularioDeAfirmaciones.ts
//
// VOCABULARIO COMPARTIDO DE AFIRMACIONES SOBRE LOS DATOS GUARDADOS DEL GRUPO
// (plan 09-37, Task 1, cierre de T-09-37-02): hasta este plan, las raíces
// léxicas, la región vigilada, el descubrimiento de ficheros del árbol y la
// comprobación de respaldo vivían declarados UNA sola vez, dentro de
// `afirmacionesRespaldadas.test.ts` — el gate de clase. Este plan añade un
// SEGUNDO gate (`invariantesDeMarcaDeEstado.test.ts`) que necesita el MISMO
// vocabulario para decidir si una marca de estado de módulo transporta una
// afirmación sobre esos datos. Copiarlo en el fichero nuevo crearía DOS
// implementaciones que pueden divergir en silencio — exactamente la clase
// de defecto (T-09-37-02) que este fichero existe para prevenir. Por eso se
// MUEVE aquí, no se copia: `afirmacionesRespaldadas.test.ts` importa de este
// módulo y ya no declara ninguna de estas constantes ni funciones por su
// cuenta.
//
// Por qué vive bajo `__tests__/` sin ser un `.test.ts`: el proyecto
// `app-logic` de `vitest.config.ts` solo recoge `app/**/*.test.ts` (ver
// `include: ['app/**/*.test.ts']`), así que este fichero no se ejecuta como
// suite — no tiene ningún `describe`/`it` propio que ejecutar. Y Gate A
// (en `afirmacionesRespaldadas.test.ts`) excluye por diseño toda ruta que
// contenga `/__tests__/` de su barrido de copy de la app, así que este
// fichero tampoco se audita a sí mismo.
//
// `import.meta.glob` (macro de Vite/Vitest), nunca `node:fs`/`node:url`:
// este fichero vive bajo `app/composables/__tests__/`, que SÍ pasa por
// `npm run typecheck` (09-24), y ese árbol no tiene `@types/node` instalado
// — mismo motivo, mismo patrón de sustitución, que ya documentó el plan
// 09-25 para el fixture JSON de `useStoredProgress.test.ts`.

// RAICES_SOBRE_LOS_DATOS_DEL_GRUPO (plan 09-34, cierre de la vía (a) de
// `09-VERIFICATION.md` ronda 8): sustituye por completo al antiguo
// vocabulario cerrado de subcadenas literales. Aquella lista cerrada de 11
// subcadenas demostró incapaz de alcanzar a la copy nueva a tiempo — ni
// «conservará» ni «reintentarlo» estaban en ella, así que la frase exacta
// que hacía daño en `endGameBody` (09-VERIFICATION.md ronda 8, vía (a)) ni
// siquiera entraba en el barrido, pese a vivir en el fichero más vigilado
// del repo. Una RAÍZ cubre todas las flexiones de su familia por
// construcción: `conserv` alcanza «conservar», «conservará», «conservado»;
// `guardad` alcanza «guardada», «guardado», «sigue guardado», «está
// guardada» («no se ha borrado» NO — para eso está `se borrar`). Ampliar la
// copy futura deja de exigir ampliar esta lista.
export const RAICES_SOBRE_LOS_DATOS_DEL_GRUPO = [
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

// contieneRaizSobreLosDatosDelGrupo (plan 09-34): comparación insensible a
// mayúsculas, con los espacios normalizados en los dos lados (ver
// `normalizarEspacios` arriba).
export function contieneRaizSobreLosDatosDelGrupo(region: string, raiz: string): boolean {
  return normalizarEspacios(region.toLowerCase()).includes(normalizarEspacios(raiz.toLowerCase()))
}

// quitarComentarios/regionVigilada (plan 09-30, fix de CR-03/WR-04 de
// `09-REVIEW.md` ronda 6): la región vigilada NO intenta acotar «el
// `<template>»` — acotar el bloque es lo que falló, con un cuantificador
// perezoso que cortaba en el PRIMER `</template>` anidado. Pasa a ser el
// FICHERO ENTERO menos lo que de verdad no es copy: comentarios y
// `<style>`. Es más barato barrer de más y auditar las excepciones una a
// una (con su motivo escrito) que confiar en un delimitador que un slot con
// nombre, un `<template v-if>` o un `<script setup>` pueden romper en
// silencio.
export function quitarComentarios(sfc: string): string {
  return sfc
    .replace(/<!--[\s\S]*?-->/g, '') // comentarios HTML
    .replace(/\/\*[\s\S]*?\*\//g, '') // comentarios de bloque JS
    .replace(/^\s*\/\/.*$/gm, '') // comentarios de línea JS
}

export function regionVigilada(sfc: string): string {
  return quitarComentarios(sfc).replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
}

// Ruta relativa desde la raíz del repo (p. ej.
// `app/components/ResumePrompt.vue`), para que las tablas de excepciones de
// ambos gates se escriban con la misma forma que el resto del repo usa al
// citar un fichero.
export function rutaRelativa(clave: string): string {
  return clave.replace(/^\/+/, '')
}

// Recorrido RECURSIVO — nunca una lista tecleada a mano: añadir una
// pantalla, un composable o un fichero del motor nuevo no puede dejarlo
// fuera de ningún barrido que use estos mapas. Módulo-scope y exportado
// para que LOS DOS gates (el de clase y el de invariantes de ciclo de vida
// de este mismo plan) compartan el mismo glob, en vez de que cada uno lo
// declare por su cuenta.
export const ficherosVueDelArbol = import.meta.glob('/app/**/*.vue', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
export const ficherosTsDelArbol = import.meta.glob('/app/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

// Set de rutas con respaldo posible (plan 09-34, Task 2): a diferencia del
// barrido de copy de la app (que excluye `/__tests__/`), este mapa NO
// filtra esa carpeta — el respaldo típico de una excepción auditada es
// justamente un test puro — y suma `engine/**/*.ts`: un respaldo puede
// apoyarse en el motor puro, no solo en `app/`.
export const ficherosEngineDelArbol = import.meta.glob('/engine/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

// contenidoDelArbolPorRuta (plan 09-39, Task 1, cierre de WR-02): mapa ÚNICO
// de ruta relativa → contenido, construido a partir de los mismos tres
// `import.meta.glob` de arriba, SIN filtrar `/__tests__/` — el respaldo
// típico de una excepción auditada es justamente un test puro. Es EL MISMO
// conjunto de rutas del que hasta este plan se derivaba `rutasConRespaldoPosible`
// (un Set que solo sabía «existe», nunca «qué contiene»): a partir de aquí
// `respaldoExiste` comprueba la presencia de la clave en ESTE mapa —una sola
// fuente de verdad sobre qué ficheros existen— y `respaldoRespaldaA` (más
// abajo) lee su CONTENIDO para comprobar si de verdad respalda la
// afirmación, no solo si el fichero citado existe.
export const contenidoDelArbolPorRuta: Record<string, string> = Object.fromEntries(
  [...Object.entries(ficherosVueDelArbol), ...Object.entries(ficherosTsDelArbol), ...Object.entries(ficherosEngineDelArbol)]
    .map(([clave, contenido]) => [rutaRelativa(clave), contenido]),
)

// respaldoExiste (plan 09-34, Task 2; reescrita en el plan 09-39, Task 1,
// sobre `contenidoDelArbolPorRuta`): comprueba que la ruta citada en un
// campo `respaldo` existe de verdad en el árbol del repo. Un motivo en
// prosa no se puede comprobar; una RUTA sí. Sigue siendo SOLO una
// comprobación de existencia — WR-02 (09-REVIEW.md ronda 8) ya deja escrito
// que una comprobación de existencia pura no basta: cualquier entrada podría
// citar un fichero real pero sin relación y pasaría igual. `respaldoRespaldaA`
// (más abajo) es quien añade la comprobación de RELEVANCIA que falta aquí.
export function respaldoExiste(ruta: string): boolean {
  return ruta in contenidoDelArbolPorRuta
}

// identificadoresComprobablesDe (plan 09-39, Task 1, WR-02): los nombres de
// fichero (`.ts`/`.vue`) que el motivo cite, más las palabras del motivo que
// parezcan un identificador de código —longitud mínima 8 y con alguna
// mayúscula INTERIOR (no la inicial: un identificador de código en camelCase
// empieza en minúscula)—. El criterio es ESTRUCTURAL (forma de un
// identificador, forma de un nombre de fichero), NUNCA una lista de palabras
// concretas: una lista de palabras sería exactamente el mismo error que
// WR-03 documenta un nivel más abajo, en `motivoNombraAlgoComprobable`.
const PATRON_NOMBRE_DE_FICHERO_EN_MOTIVO = /[\w.[\]-]+\.(?:ts|vue)\b/g
const PATRON_PALABRA_EN_MOTIVO = /\b[a-z][a-zA-Z0-9]*\b/g

export function identificadoresComprobablesDe(motivo: string): string[] {
  const nombresDeFichero = motivo.match(PATRON_NOMBRE_DE_FICHERO_EN_MOTIVO) ?? []
  const identificadoresDeCodigo = (motivo.match(PATRON_PALABRA_EN_MOTIVO) ?? []).filter(
    palabra => palabra.length >= 8 && /[A-Z]/.test(palabra),
  )
  return [...nombresDeFichero, ...identificadoresDeCodigo]
}

// motivoNombraAlgoComprobable (plan 09-39, Task 2, WR-03): una línea, pero
// con nombre propio y comentario propio, para que el gate la pueda llamar
// sin reimplementar el criterio y para que Gate S la pueda poner roja con
// casos sintéticos. `true` si el motivo nombra al menos un fichero o un
// identificador de código; `false` para cualquier prosa de relleno, sin
// importar cómo esté redactada — el criterio no depende de la REDACCIÓN del
// motivo (eso era el vocabulario cerrado que WR-03 encontró), solo de que
// nombre algo que se puede ir a mirar.
export function motivoNombraAlgoComprobable(motivo: string): boolean {
  return identificadoresComprobablesDe(motivo).length > 0
}

// respaldoRespaldaA (plan 09-39, Task 1, WR-02): comprobación de RELEVANCIA
// que `respaldoExiste` no hace. `false` si la ruta no está en el árbol; en
// caso contrario, `true` si su contenido contiene la raíz vigilada (con
// `contieneRaizSobreLosDatosDelGrupo`, ya normalizada e insensible a
// mayúsculas) o alguno de los identificadores comprobables que el motivo
// nombra. Dos ideas, a propósito, por escrito:
// (a) esto NO es análisis estático exhaustivo y no pretende serlo — el
//     propio WR-02 dice que una comprobación de SUBCADENA ya cierra el
//     hueco que deja la comprobación de existencia pura, no que resuelva
//     todo lo que un análisis estático real resolvería;
// (b) lo que SÍ hace imposible es la evasión CONCRETA que WR-02 describe:
//     citar un fichero real sin ninguna relación con la afirmación que dice
//     respaldar.
export function respaldoRespaldaA(rutaDelRespaldo: string, raiz: string, motivo: string): boolean {
  const contenido = contenidoDelArbolPorRuta[rutaDelRespaldo]
  if (contenido === undefined) return false
  if (contieneRaizSobreLosDatosDelGrupo(contenido, raiz)) return true
  return identificadoresComprobablesDe(motivo).some(identificador => contenido.includes(identificador))
}
