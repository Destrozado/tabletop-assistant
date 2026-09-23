// app/composables/__tests__/pilaDeAvisos.test.ts
//
// GATE ESTRUCTURAL de la franja de avisos en flujo (quick 260923-3rm, cierre
// de WR-04 ronda 4 y WR-05 ronda 4, y re-comprobación estructural de
// WR-05(b) — ver `.planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md`).
//
// Hasta este quick, `UpdateBanner.vue`/`HistorySavedNotice.vue` eran
// `fixed top-0 inset-x-0 z-40` — las dos ocupaban el MISMO rectángulo si
// estaban visibles a la vez (WR-04 ronda 4, la segunda tapaba por completo a
// la primera), y `pointer-events-none` en el contenedor dejaba pasar los
// toques hacia una cabecera oculta debajo (WR-05 ronda 4). Este quick
// sustituye por completo ese mecanismo: las dos bandas pasan a vivir EN
// FLUJO, apiladas dentro de una franja propia en `app/app.vue`, que resta su
// altura real a la página en vez de flotar sobre ella.
//
// Tres aserciones, cada una con un caso SINTÉTICO que la pone roja primero
// (para que el gate no pueda pasar en vacío, ni con el árbol real ni con uno
// inventado):
// (a) ni `UpdateBanner.vue` ni `HistorySavedNotice.vue` llevan como clase
//     `fixed`/`inset-x-0`/`z-40` ni las dos utilidades de eventos de puntero
//     (`pointer-events-none`/`pointer-events-auto`) — regex por TOKEN, con
//     `\b` a ambos lados, para no confundir "z-40" con un futuro "xz-401"
//     ni "fixed" con una palabra que lo contenga.
// (b) `app/app.vue` contiene la franja en flujo exacta: un bloque con la
//     clase `shrink-0` que envuelve, en este orden, `<ClientOnly>`,
//     `<UpdateBanner />`, `<HistorySavedNotice />`, `</ClientOnly>` (tolera
//     espacios en blanco entre etiquetas), seguido de un elemento cuyas
//     clases incluyen `flex-1` y `min-h-0` que envuelve directamente
//     `<NuxtPage />`; y el propio `#app-root` lleva `h-dvh` y `flex-col`.
// (c) ningún `.vue` bajo `/app/components/` ni `/app/pages/` usa `h-dvh`
//     como clase (WR-05(b): las pantallas toman su altura del envoltorio
//     `flex-1 min-h-0` de `app/app.vue`, nunca directamente del viewport).
//
// Recorrido de ficheros vía el vocabulario compartido (`import.meta.glob`),
// nunca `node:fs` — mismo motivo que el resto de gates de este directorio
// (`app/composables/__tests__/vocabularioDeAfirmaciones.ts`, cabecera).
import { describe, expect, it } from 'vitest'
import { ficherosVueDelArbol, quitarComentarios, regionVigilada, rutaRelativa } from './vocabularioDeAfirmaciones'

// (a) --------------------------------------------------------------------

const TOKENS_PROHIBIDOS_EN_LAS_BANDAS = ['fixed', 'inset-x-0', 'z-40', 'pointer-events-none', 'pointer-events-auto']

function escaparRegExp(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function tokensProhibidosPresentes(contenido: string): string[] {
  const region = regionVigilada(contenido)
  return TOKENS_PROHIBIDOS_EN_LAS_BANDAS.filter((token) => {
    const patron = new RegExp(`\\b${escaparRegExp(token)}\\b`)
    return patron.test(region)
  })
}

function contenidoDe(ruta: string): string {
  const clave = Object.keys(ficherosVueDelArbol).find(k => rutaRelativa(k) === ruta)
  if (!clave) throw new Error(`No se encontró ${ruta} en el glob de ficherosVueDelArbol — revisar la ruta o el patrón del glob.`)
  return ficherosVueDelArbol[clave]!
}

describe('Franja de avisos en flujo (quick 260923-3rm) — (a) sin posicionamiento ni puntero en las bandas', () => {
  it('caso sintético: un SFC con class="… fixed top-0 inset-x-0 z-40 pointer-events-none …" SÍ se detecta (el gate no pasa en vacío)', () => {
    const sfcSintetico = '<template><div class="bg-surface fixed top-0 inset-x-0 z-40 pointer-events-none"><button class="pointer-events-auto">x</button></div></template>'
    expect(tokensProhibidosPresentes(sfcSintetico).sort()).toEqual(
      [...TOKENS_PROHIBIDOS_EN_LAS_BANDAS].sort(),
    )
  })

  it('caso sintético: una clase parecida pero distinta ("z-401", "fixedWidth") NO produce un falso positivo (el regex usa \\b)', () => {
    const sfcSintetico = '<template><div class="z-401 fixedWidth">x</div></template>'
    expect(tokensProhibidosPresentes(sfcSintetico)).toEqual([])
  })

  it('UpdateBanner.vue no lleva ninguno de los tokens prohibidos (WR-04/WR-05 ronda 4)', () => {
    const encontrados = tokensProhibidosPresentes(contenidoDe('app/components/UpdateBanner.vue'))
    expect(
      encontrados,
      `UpdateBanner.vue sigue llevando ${encontrados.join(', ')} — el mecanismo \`fixed\` de 09-22 no se ha retirado del todo (WR-04/WR-05 ronda 4, quick 260923-3rm).`,
    ).toEqual([])
  })

  it('HistorySavedNotice.vue no lleva ninguno de los tokens prohibidos (WR-04/WR-05 ronda 4)', () => {
    const encontrados = tokensProhibidosPresentes(contenidoDe('app/components/HistorySavedNotice.vue'))
    expect(
      encontrados,
      `HistorySavedNotice.vue sigue llevando ${encontrados.join(', ')} — el mecanismo \`fixed\` de 09-22 no se ha retirado del todo (WR-04/WR-05 ronda 4, quick 260923-3rm).`,
    ).toEqual([])
  })
})

// (b) --------------------------------------------------------------------

// Bloque de la franja: contenedor `shrink-0` → ClientOnly → UpdateBanner →
// HistorySavedNotice → /ClientOnly, en ese orden exacto, tolerando espacios
// en blanco entre etiquetas.
const REGEX_FRANJA_DE_AVISOS = /<div class="[^"]*\bshrink-0\b[^"]*">\s*<ClientOnly>\s*<UpdateBanner \/>\s*<HistorySavedNotice \/>\s*<\/ClientOnly>\s*<\/div>/

// Envoltorio de página: un elemento cuyas clases incluyen `flex-1` Y
// `min-h-0` (en cualquier orden dentro del atributo, de ahí los dos
// lookaheads) que envuelve DIRECTAMENTE `<NuxtPage />`.
const REGEX_ENVOLTORIO_DE_PAGINA = /<div class="(?=[^"]*\bflex-1\b)(?=[^"]*\bmin-h-0\b)[^"]*">\s*<NuxtPage \/>\s*<\/div>/

describe('Franja de avisos en flujo (quick 260923-3rm) — (b) estructura exacta de app/app.vue', () => {
  const regionAppVue = quitarComentarios(contenidoDe('app/app.vue'))

  it('caso sintético: una franja SIN las dos bandas en ese orden dentro de ClientOnly NO casa (el gate no pasa en vacío)', () => {
    const sfcSintetico = '<template><div id="app-root"><div class="shrink-0"><ClientOnly><UpdateBanner /></ClientOnly></div><div class="flex-1 min-h-0"><NuxtPage /></div></div></template>'
    expect(REGEX_FRANJA_DE_AVISOS.test(sfcSintetico)).toBe(false)
  })

  it('caso sintético: un envoltorio sin min-h-0 (solo flex-1) NO casa', () => {
    const sfcSintetico = '<template><div class="flex-1"><NuxtPage /></div></template>'
    expect(REGEX_ENVOLTORIO_DE_PAGINA.test(sfcSintetico)).toBe(false)
  })

  it('app/app.vue tiene el bloque shrink-0 con <ClientOnly><UpdateBanner /><HistorySavedNotice /></ClientOnly> en ese orden exacto', () => {
    expect(
      REGEX_FRANJA_DE_AVISOS.test(regionAppVue),
      'no se encontró en app/app.vue el bloque de la franja de avisos (WR-04/WR-05 ronda 4): un contenedor `shrink-0` con `ClientOnly` > `UpdateBanner` > `HistorySavedNotice`, en ese orden exacto.',
    ).toBe(true)
  })

  it('tras la franja hay un envoltorio flex-1 min-h-0 que envuelve directamente <NuxtPage />', () => {
    expect(
      REGEX_ENVOLTORIO_DE_PAGINA.test(regionAppVue),
      'no se encontró en app/app.vue un elemento con `flex-1` y `min-h-0` envolviendo directamente `<NuxtPage />` (WR-05(b): la página tiene que restar la altura de la franja, no sumarla).',
    ).toBe(true)
  })

  it('#app-root lleva h-dvh y flex-col', () => {
    const coincidencia = /id="app-root"\s+class="([^"]*)"/.exec(regionAppVue)
    expect(coincidencia, 'no se encontró `id="app-root"` con un atributo `class` en app/app.vue').not.toBeNull()
    const clases = coincidencia![1]!
    expect(clases, '#app-root no lleva h-dvh — la franja necesita que la columna raíz mida el viewport completo').toMatch(/\bh-dvh\b/)
    expect(clases, '#app-root no lleva flex-col — la franja necesita que sus dos hijos se apilen en columna').toMatch(/\bflex-col\b/)
  })
})

// (c) --------------------------------------------------------------------

describe('Franja de avisos en flujo (quick 260923-3rm) — (c) ninguna pantalla usa h-dvh (WR-05(b))', () => {
  it('caso sintético: un componente con class="h-dvh …" SÍ se detecta', () => {
    const sfcSintetico = '<template><div class="h-dvh bg-background">x</div></template>'
    expect(/\bh-dvh\b/.test(quitarComentarios(sfcSintetico))).toBe(true)
  })

  it('ningún .vue bajo app/components/ ni app/pages/ usa h-dvh como clase', () => {
    const ofensores: string[] = []
    for (const [clave, contenido] of Object.entries(ficherosVueDelArbol)) {
      const ruta = rutaRelativa(clave)
      if (!ruta.startsWith('app/components/') && !ruta.startsWith('app/pages/')) continue
      const region = quitarComentarios(contenido)
      if (/\bh-dvh\b/.test(region)) ofensores.push(ruta)
    }
    expect(
      ofensores,
      `los siguientes ficheros siguen usando h-dvh como clase (WR-05(b), quick 260923-3rm): ${ofensores.join(', ')} — deberían tomar h-full del envoltorio flex-1 min-h-0 de app/app.vue.`,
    ).toEqual([])
  })

  it('barre al menos un fichero real bajo app/components/ o app/pages/ (el gate no está vacío por accidente)', () => {
    const barridos = Object.keys(ficherosVueDelArbol).filter((clave) => {
      const ruta = rutaRelativa(clave)
      return ruta.startsWith('app/components/') || ruta.startsWith('app/pages/')
    })
    expect(barridos.length).toBeGreaterThan(0)
  })
})
