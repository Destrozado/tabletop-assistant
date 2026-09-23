#!/usr/bin/env node
// scripts/catalogue/fetch-marvelcdb.mjs
//
// Qué es: CLI invocado A MANO por el desarrollador para regenerar
// `content/marvel-characters.json` desde la API pública de MarvelCDB
// (https://marvelcdb.com/api/public). No requiere ninguna clave ni cuenta:
// la API es pública y de solo lectura.
//
// D-06 (heredado de la Fase 3.1): este script NUNCA se invoca desde `build`,
// `generate`, `postinstall` ni CI ni Vercel. Meter una llamada de red al
// build de despliegue rompería "sin backend" (CLAUDE.md §Constraints). Se
// ejecuta a mano, en la máquina del desarrollador, cuando se compra una caja
// nueva o se detecta un dato equivocado.
//
// D-09: este fichero es el ÚNICO escritor de `content/marvel-characters.json`.
// Nadie edita ese JSON a mano, nunca. Un número equivocado en el catálogo
// committeado significa que la regla de extracción de aquí está mal — se
// corrige en el script y se regenera, nunca a mano en el JSON.
//
// D-10: la salida es determinista pura — sin ningún campo de fecha ni marca
// temporal de generación. Re-ejecutar este script sin que MarvelCDB haya
// cambiado nada debe dejar `git diff -- content/marvel-characters.json`
// vacío. La fecha de generación real ya la guarda el commit de git; no hace
// falta duplicarla dentro del fichero.
//
// CAT-04: la proyección de cada carta a objeto de catálogo es una LISTA
// BLANCA campo a campo. Prohibido expandir el objeto de carta crudo
// completo (spread) al construir el objeto de retorno: la respuesta de
// MarvelCDB trae decenas de claves
// (`text`, `real_text`, `flavor`, `traits`, `imagesrc`, `illustrator`, `url`,
// `octgn_id`, entre otras) que son texto de carta, cita de sabor o
// referencia a arte con copyright. Ninguna de ellas debe entrar jamás al
// repo público — sólo los seis campos de héroe y los cuatro de etapa de
// villano (más el sub-objeto opcional `expert`, de esos mismos tres campos
// base) que las funciones de extracción de abajo devuelven explícitamente.
//
// ── CÓMO AÑADIR UN HÉROE O VILLANO NUEVO (CAT-07) ───────────────────────────
// 1. Añadir una fila a `HERO_CARDS` (para un héroe) o las 1..n filas de etapa
//    correspondientes a `VILLAIN_STAGE_CARDS` (para un villano), con su
//    `code` y su `expectedName` (o `villainName`/`stage`/`expectedSetCode`
//    para una etapa de villano). Si el escenario del villano nuevo trae un
//    set de villano de modo Experto (`card_set_code` alternativo con salud
//    más alta), la misma fila de etapa gana además `expertCode` (el `code`
//    de la carta Experto de esa etapa) y `expectedExpertSetCode` (su
//    `card_set_code`) — los dos juntos o ninguno. Si el escenario no trae
//    modo Experto, se dejan fuera y la etapa sale del catálogo sin clave
//    `expert` (caso de Rhino y Ultron: villanos del Core Set sin set
//    alternativo).
// 2. Ejecutar `npm run catalogue:generate`.
// 3. Revisar el diff de `content/marvel-characters.json` — debe añadir
//    exactamente la fila nueva, sin tocar nada más (D-10).
// 4. Commitear el script y el JSON juntos.
//
// El `code` de una carta se encuentra en la URL de esa carta en
// marvelcdb.com (p. ej. `https://marvelcdb.com/card/01001a` → code
// `01001a`). Para héroes, usar SIEMPRE el sufijo `a` (lado héroe, el que
// lleva `linked_card` embebido con el alter ego) — nunca el `b` (carta de
// alter ego suelta) ni el `c` (formas alternativas sin identidad secreta
// separada, p. ej. Giant-Man/Wasp sin `linked_card`; ver comentario junto a
// `12001a`/`13001a` más abajo).
//
// Endpoints usados (sustituto de la marca de versión que D-10 descarta):
//   GET https://marvelcdb.com/api/public/card/{code}.json
// Esta llamada YA embebe `linked_card` en la respuesta cuando la carta lo
// tiene — nunca hace falta una segunda llamada para resolver el alter ego.

import { writeFileSync as writeFile } from 'node:fs'

// ── Constantes ───────────────────────────────────────────────────────────────
const API_BASE = 'https://marvelcdb.com/api/public'
const CATALOGUE_PATH = 'content/marvel-characters.json'
const GAME_ID = 'marvel-champions'
const STAGE_MAP = { I: 1, II: 2, III: 3 }
// Pausa fija entre peticiones HTTP sucesivas (ver comentario junto a
// fetchCard más abajo) — pacing, no reintento ante fallo.
const REQUEST_DELAY_MS = 1500

// Nota deliberada: no existe ninguna constante de espera/reintento aquí, a
// diferencia de scripts/voice/generate.mjs. MarvelCDB no tiene cuota ni 429
// documentado; un HTTP 500 en este API significa "código de carta
// inválido/inexistente", que es información sobre la que hay que abortar
// (D-05/D-06), no ruido transitorio que merezca un reintento con espera.

// HERO_CARDS — 23 filas, en este orden exacto (05-CONTEXT.md D-03: los 5 del
// Core Set primero, luego 18 de packs sueltos). El sufijo del `code` es
// siempre `a` (lado héroe, con `linked_card` embebido); nunca `c`.
const HERO_CARDS = [
  { code: '01001a', expectedName: 'Spider-Man' },
  { code: '01010a', expectedName: 'Captain Marvel' },
  { code: '01019a', expectedName: 'She-Hulk' },
  { code: '01029a', expectedName: 'Iron Man' },
  { code: '01040a', expectedName: 'Black Panther' },
  { code: '03001a', expectedName: 'Captain America' },
  { code: '05001a', expectedName: 'Ms. Marvel' },
  { code: '06001a', expectedName: 'Thor' },
  { code: '08001a', expectedName: 'Black Widow' },
  { code: '09001a', expectedName: 'Doctor Strange' },
  { code: '10001a', expectedName: 'Hulk' },
  // Ant-Man: usar el sufijo "a" (lado héroe con linked_card), nunca el
  // sufijo "c" (forma alternativa "Giant-Man", sin linked_card).
  { code: '12001a', expectedName: 'Ant-Man' },
  // Wasp: mismo caso — sufijo "a", nunca el sufijo "c" (forma alternativa
  // sin linked_card).
  { code: '13001a', expectedName: 'Wasp' },
  { code: '14001a', expectedName: 'Quicksilver' },
  { code: '15001a', expectedName: 'Scarlet Witch' },
  { code: '19001a', expectedName: 'Drax' },
  { code: '25001a', expectedName: 'Valkyrie' },
  { code: '26001a', expectedName: 'Vision' },
  { code: '28001a', expectedName: 'Nova' },
  { code: '36001a', expectedName: 'Storm' },
  { code: '44001a', expectedName: 'Deadpool' },
  { code: '46001a', expectedName: 'Iceman' },
  { code: '47001a', expectedName: 'Jubilee' },
]

// VILLAIN_STAGE_CARDS — 9 filas, en este orden exacto (D-02: Klaw queda fuera
// a propósito, exclusión deliberada del usuario).
//
// Gap de truth #8 (05-VERIFICATION.md), decisión explícita del usuario: los
// códigos del set `card_set_code: exp_kang` ("Expert Kang", modo Experto de
// este escenario: 11034/11035/11039) SÍ están declarados — como `expertCode`
// de cada fila estándar de Kang — porque `content/marvel-champions.json` ya
// instruye sustituir las cartas de villano numeradas en dificultad Experta
// (paso `setup.escenario.04`, variante `expert`), y narrar 12/18/20 en esa
// partida sería guiar mal (CLAUDE.md §Constraints). Cifras: 15/22/25 frente a
// 12/18/20, con `health_per_hero` true/false/true por etapa en los dos sets
// (la etapa II también es `false` en Experto — misma asimetría por etapa que
// ya justifica D-11, no un error de extracción). La etapa II Experta también
// tiene cuatro alternativas narrativas (11035 Immortus, 11036 Iron Lad, 11037
// Rama-Tut, 11038 Scarlet Centurion) con 22/false/false idénticos; se declara
// 11035 como representante, igual que 11002 en el set estándar, sin impacto
// numérico. Un villano SIN `expertCode` sale del catálogo sin ninguna clave
// `expert` — eso significa "el modo Experto de este escenario no sustituye
// sus cartas numeradas" (Rhino, Ultron), no "dato pendiente". Esta es la
// decisión explícita que 05-RESEARCH.md dejaba abierta al calificar
// `exp_kang` de fuera de alcance salvo decisión futura explícita.
const VILLAIN_STAGE_CARDS = [
  { villainName: 'Rhino', code: '01094', stage: 1, expectedSetCode: 'rhino' },
  { villainName: 'Rhino', code: '01095', stage: 2, expectedSetCode: 'rhino' },
  { villainName: 'Rhino', code: '01096', stage: 3, expectedSetCode: 'rhino' },
  { villainName: 'Kang', code: '11001', stage: 1, expectedSetCode: 'kang', expertCode: '11034', expectedExpertSetCode: 'exp_kang' },
  // Etapa II de Kang tiene cuatro alternativas narrativas con cifras
  // idénticas (11002 Immortus, 11003 Iron Lad, 11004 Rama-Tut, 11005 Scarlet
  // Centurion: todas 18/false/false). Se declara 11002 como representante;
  // cuál de las cuatro da igual a efectos numéricos, que es todo lo que este
  // catálogo guarda (D-02: el `name` del villano nunca sale de esta carta).
  { villainName: 'Kang', code: '11002', stage: 2, expectedSetCode: 'kang', expertCode: '11035', expectedExpertSetCode: 'exp_kang' },
  { villainName: 'Kang', code: '11006', stage: 3, expectedSetCode: 'kang', expertCode: '11039', expectedExpertSetCode: 'exp_kang' },
  { villainName: 'Ultron', code: '01134', stage: 1, expectedSetCode: 'ultron' },
  { villainName: 'Ultron', code: '01135', stage: 2, expectedSetCode: 'ultron' },
  { villainName: 'Ultron', code: '01136', stage: 3, expectedSetCode: 'ultron' },
]

// ── Funciones ────────────────────────────────────────────────────────────────

// Copia exacta de `slugifyCharacterName()` en engine/catalogueSchema.ts. Si
// las dos funciones divergen, el esquema de esa fase rechaza el `id` que
// produce este script y CI falla — eso es a propósito (DC-02 del plan
// 05-01): las dos deben coincidir carácter a carácter.
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchCard(code) {
  const response = await fetch(`${API_BASE}/card/${code}.json`)
  if (!response.ok) {
    // D-05/D-06: MarvelCDB devuelve HTTP 500 (no 404) para un código
    // inexistente o mal escrito — `!response.ok` ya lo captura igual.
    const bodyText = await response.text().catch(() => '')
    throw new Error(`Código ${code}: MarvelCDB respondió HTTP ${response.status}. Cuerpo (primeros 200 caracteres): ${bodyText.slice(0, 200)}`)
  }
  const json = await response.json()
  // Espaciado fijo entre peticiones secuenciales, no un reintento: sin esta
  // pausa, ráfagas de conexiones sucesivas a marvelcdb.com empezaron a
  // agotar el tiempo de conexión (nunca un HTTP 500) tras las primeras ~9
  // peticiones durante la verificación de este script. No es la puerta
  // D-05/D-06 (esa sigue abortando ante cualquier respuesta no-ok, sin
  // reintentar); esto solo evita disparar ese límite de conexión en primer
  // lugar.
  await sleep(REQUEST_DELAY_MS)
  return json
}

function extractHero({ code, expectedName }) {
  return fetchCard(code).then((card) => {
    if (card.name !== expectedName) {
      throw new Error(`Código ${code}: se esperaba el nombre "${expectedName}" pero la API devolvió "${card.name}"`)
    }
    if (card.type_code !== 'hero') {
      throw new Error(`Código ${code}: se esperaba type_code "hero" pero la API devolvió "${card.type_code}"`)
    }
    if (!card.linked_card) {
      throw new Error(`Código ${code} ("${card.name}"): la carta no trae linked_card embebido (¿es una forma alternativa sin identidad secreta, como Giant-Man/Wasp-sin-linked_card? usa el sufijo "a", no "c")`)
    }
    const { health } = card.linked_card
    const handSizeHero = card.hand_size
    const handSizeAlterEgo = card.linked_card.hand_size
    if (!Number.isInteger(health) || health <= 0) {
      throw new Error(`Código ${code} ("${card.name}"): linked_card.health no es un entero positivo (${health})`)
    }
    if (!Number.isInteger(handSizeHero) || handSizeHero <= 0) {
      throw new Error(`Código ${code} ("${card.name}"): hand_size del lado héroe no es un entero positivo (${handSizeHero})`)
    }
    if (!Number.isInteger(handSizeAlterEgo) || handSizeAlterEgo <= 0) {
      throw new Error(`Código ${code} ("${card.name}"): linked_card.hand_size (lado alter ego) no es un entero positivo (${handSizeAlterEgo})`)
    }
    // Corrección (gap CR-01 de 05-VERIFICATION.md): este comentario reemplaza
    // al anexo "caso concreto" de D-09, cuya premisa fáctica quedó refutada.
    // Cada CARA de la carta de identidad imprime su propio tamaño de mano
    // (Rules Reference v1.7, Apéndice III, anatomía de carta, punto 14; y la
    // entrada "HAND SIZE": "Each player checks their hand size at the end of
    // the player phase..."). Ejemplo impreso: Spider-Man 5 (cara de héroe) /
    // Peter Parker 6 (cara de alter ego) — dos valores reales y distintos, no
    // uno "correcto" y otro descartable. El chequeo de final de fase de
    // jugador usa el de la cara ACTIVA en cada ronda, por eso se guardan los
    // dos. `health` sí sale siempre de `linked_card`, eso no cambia. Un
    // handSizeHero bajo y llamativo (Iron Man expone 1) es el valor impreso
    // real de esa cara y NO debe "corregirse": la habilidad de la carta que
    // lo modifica se resuelve en la interfaz de la Fase 7, nunca en el
    // catálogo. La decisión D-09 en sí —nadie edita el JSON a mano, el fix
    // va en el script— sigue vigente y es literalmente el procedimiento que
    // se acaba de seguir.
    return {
      id: slugify(card.name),
      name: card.name,
      alterEgo: card.linked_card.name,
      health,
      handSizeHero,
      handSizeAlterEgo,
    }
  })
}

// Puertas comunes a la carta estándar y a la carta Experto de una etapa de
// villano — extraídas para no duplicarlas entre las dos (gap de truth #8).
// `setLabel` ('estándar' | 'Experto') solo alimenta los mensajes de error,
// para que el desarrollador sepa qué descarga concreta falló.
function extractStageFields(card, { villainName, code, stage, expectedSetCode, setLabel }) {
  if (card.type_code !== 'villain') {
    throw new Error(`Código ${code} (${villainName} etapa ${stage}, set ${setLabel}): se esperaba type_code "villain" pero la API devolvió "${card.type_code}"`)
  }
  if (card.card_set_code !== expectedSetCode) {
    // Esta es la puerta que atrapa un card_set_code equivocado colado por
    // error en vez del set declarado para esta fila (estándar o Experto).
    throw new Error(`Código ${code} (${villainName} etapa ${stage}, set ${setLabel}): se esperaba card_set_code "${expectedSetCode}" pero la API devolvió "${card.card_set_code}"`)
  }
  const mappedStage = STAGE_MAP[card.stage]
  if (mappedStage === undefined) {
    throw new Error(`Código ${code} (${villainName} etapa ${stage}, set ${setLabel}): la API devolvió un valor de stage no mapeable ("${card.stage}")`)
  }
  if (mappedStage !== stage) {
    throw new Error(`Código ${code} (${villainName}, set ${setLabel}): se declaró etapa ${stage} pero la API dice stage "${card.stage}" (mapea a ${mappedStage})`)
  }
  if (!Number.isInteger(card.health) || card.health <= 0) {
    throw new Error(`Código ${code} (${villainName} etapa ${stage}, set ${setLabel}): health no es un entero positivo (${card.health})`)
  }
  if (typeof card.health_per_hero !== 'boolean' || typeof card.health_per_group !== 'boolean') {
    throw new Error(`Código ${code} (${villainName} etapa ${stage}, set ${setLabel}): health_per_hero/health_per_group no son booleanos (${card.health_per_hero}/${card.health_per_group})`)
  }
  return {
    health: card.health,
    healthPerHero: card.health_per_hero,
    healthPerGroup: card.health_per_group,
  }
}

async function extractVillainStage({ villainName, code, stage, expectedSetCode, expertCode, expectedExpertSetCode }) {
  // Puertas propias de la dimensión Experta, ANTES de descargar nada (D-05:
  // fallar alto antes que escribir un dato dudoso).
  if ((expertCode === undefined) !== (expectedExpertSetCode === undefined)) {
    throw new Error(`Fila ${villainName} etapa ${stage}: expertCode y expectedExpertSetCode deben declararse juntos o no declararse (expertCode=${expertCode}, expectedExpertSetCode=${expectedExpertSetCode})`)
  }
  if (expertCode !== undefined && expertCode === code) {
    throw new Error(`Fila ${villainName} etapa ${stage}: expertCode ("${expertCode}") no puede ser igual al code estándar de la fila`)
  }

  const standardCard = await fetchCard(code)
  const standardFields = extractStageFields(standardCard, { villainName, code, stage, expectedSetCode, setLabel: 'estándar' })

  // El `name` del villano NUNCA sale de esta carta — la etapa II de Kang
  // varía entre cuatro nombres narrativos con cifras idénticas (D-02); sale
  // siempre de `villainName`, declarado arriba en VILLAIN_STAGE_CARDS.
  const result = {
    stage,
    health: standardFields.health,
    healthPerHero: standardFields.healthPerHero,
    healthPerGroup: standardFields.healthPerGroup,
  }

  // La función solo descarga la carta Experto cuando la fila declara
  // expertCode. La clave `expert` no existe en absoluto cuando no hay
  // expertCode (asignación condicional, nunca `undefined` ni spread).
  if (expertCode !== undefined) {
    const expertCard = await fetchCard(expertCode)
    const expertFields = extractStageFields(expertCard, { villainName, code: expertCode, stage, expectedSetCode: expectedExpertSetCode, setLabel: 'Experto' })
    result.expert = {
      health: expertFields.health,
      healthPerHero: expertFields.healthPerHero,
      healthPerGroup: expertFields.healthPerGroup,
    }
  }

  return result
}

function writeCatalogue(heroes, villains) {
  const catalogue = { gameId: GAME_ID, heroes, villains }
  // Sin ordenación alfabética (el orden es el declarado en HERO_CARDS /
  // VILLAIN_STAGE_CARDS, D-04) y sin ningún campo de fecha (D-10).
  writeFile(CATALOGUE_PATH, `${JSON.stringify(catalogue, null, 2)}\n`)
}

async function main() {
  // D-05/D-09: los 35 códigos (23 héroes + 9 etapas estándar + 3 etapas
  // Experto de Kang) se resuelven EN MEMORIA COMPLETA antes de escribir
  // nada. Solo si los 35 tuvieron éxito se llama a writeCatalogue. Ninguna
  // escritura parcial de content/marvel-characters.json puede ocurrir jamás
  // — diferencia deliberada respecto a scripts/voice/generate.mjs, que
  // escribe incrementalmente (ese script es reanudable por diseño; este es
  // todo o nada). Con el pacing de REQUEST_DELAY_MS (1500 ms) esto tarda
  // ~53 s.
  const heroes = []
  for (const row of HERO_CARDS) {
    heroes.push(await extractHero(row))
  }

  const villainOrder = []
  const villainStagesById = new Map()
  for (const row of VILLAIN_STAGE_CARDS) {
    const stage = await extractVillainStage(row)
    const id = slugify(row.villainName)
    if (!villainStagesById.has(id)) {
      villainStagesById.set(id, { id, name: row.villainName, stages: [] })
      villainOrder.push(id)
    }
    villainStagesById.get(id).stages.push(stage)
  }
  const villains = villainOrder.map(id => villainStagesById.get(id))

  writeCatalogue(heroes, villains)
  console.log(`Escritos ${heroes.length} héroes y ${villains.length} villanos en ${CATALOGUE_PATH}`)
}

main().catch((error) => {
  console.error(error.message)
  console.error('No se ha escrito nada en content/marvel-characters.json (D-05).')
  process.exit(1)
})
