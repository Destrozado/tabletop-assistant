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
// La única excepción es la etapa placeholder de PLACEHOLDER_VILLAINS, que es
// un literal del script y no sale de ninguna carta.
//
// ── CÓMO AÑADIR UN HÉROE O VILLANO NUEVO (CAT-07) ───────────────────────────
// 1. Añadir una fila a `HERO_CARDS` (para un héroe) o las 1..n filas de etapa
//    correspondientes a `VILLAIN_STAGE_CARDS` (para un villano), con su
//    `code` y su `expectedName` (o `villainName`/`stage`/`expectedSetCode`
//    para una etapa de villano). Si el escenario del villano nuevo trae un
//    set de villano de modo Experto con cifras propias (`card_set_code`
//    alternativo con salud más alta), la misma fila de etapa gana además
//    `expertCode` (el `code` de la carta Experto de esa etapa) y
//    `expectedExpertSetCode` (su `card_set_code`) — los dos juntos o
//    ninguno. Si el escenario no trae ese set alternativo con cifras
//    propias, se dejan fuera y la etapa sale del catálogo sin clave
//    `expert` (caso de Rhino, Ultron y Enchantress: no tienen cifras Expertas propias,
//    aunque sí cambian de etapa en Experto — ver VILLAIN_SCENARIOS).
// 1b. Para un villano nuevo, añadir también una fila a `VILLAIN_SCENARIOS`
//    con `expertStartStage` (la etapa con la que empieza la partida en
//    Experto, comprobada contra la carta 1A del plan principal por
//    `checkMainScheme`) y `recommendedModuleCode` (el `card_set_code` del
//    módulo recomendado por esa misma carta, también comprobado por
//    `checkMainScheme` contra su texto — aborta si no coincide). Si el
//    escenario no dice nada especial para Experto, `expertStartStage: 1`.
//    Claves opcionales de fila (quick 261002-2am): `expertStartStageSource:
//    'rulebook'` (Experto respaldado por el libro de la caja, no por la
//    carta), `additionalRecommendedModuleCodes` (más recomendados, en orden)
//    y `fixedSetCodes` (conjuntos fijos del escenario).
// 1c. Si el escenario nuevo viene de una caja que el grupo no tenía
//    todavía, añadir su código de pack a `ENCOUNTER_PACKS` y sus módulos de
//    encuentro (dato a mano, `card_set_code`/pack/dificultad si se conoce)
//    a `ENCOUNTER_MODULES` (quick 260925-mpj, D-01).
// 1d. Para un escenario que el grupo quiere poder elegir SIN modelar sus
//    cifras (villano placeholder, vida 0), añadir una fila a
//    `PLACEHOLDER_VILLAINS` (quick 261001-o3p). No lleva filas en
//    VILLAIN_STAGE_CARDS ni VILLAIN_SCENARIOS.
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
// API_BASE_ES (quick 260925-mpj, D-01): mismo API, dominio en español —
// solo se usa para leer `card_set_name` (el nombre español impreso en las
// cartas de la caja del grupo), nunca para ninguna otra cifra o campo.
const API_BASE_ES = 'https://es.marvelcdb.com/api/public'
const CATALOGUE_PATH = 'content/marvel-characters.json'
const GAME_ID = 'marvel-champions'
// Loki, God of Lies (55027a) imprime su única etapa en cifra arábiga «1», no
// «I». expertModeRegex solo captura romanos, así que esto no afecta a esa
// comprobación. La puerta mappedStage === stage de extractStageFields sigue
// en pie.
const STAGE_MAP = { I: 1, II: 2, III: 3, 1: 1 }
// Pausa fija entre peticiones HTTP sucesivas (ver comentario junto a
// fetchCard más abajo) — pacing, no reintento ante fallo.
const REQUEST_DELAY_MS = 1500

// ENCOUNTER_PACKS (D-01): solo las cajas del grupo — Core Set y «Antiguo y
// futuro Kang» (toafk). Añadir un pack nuevo aquí cuando el grupo compre una
// caja nueva (CAT-07/paso 1c de arriba).
// `twc`: «La Brigada de Demolición» (The Wrecking Crew), comprada el
// 2026-10-01; solo trae sets de tipo villain, ningún modular (comprobado
// contra la API el día de este quick), así que ENCOUNTER_MODULES y
// EXCLUDED_MODULAR_CODES no cambian.
// `tt`: «Trickster Takeover», comprado el 2026-10-01. Trae dos sets de
// villano (enchantress_villain, god_of_lies) y un solo modular
// (trickster_magic), comprobado contra la API ese día.
// `trors`: «The Rise of Red Skull» (quick 261002-2am): cinco villanos y seis
// modulares (tres elegibles, tres excluidos, ver EXCLUDED_MODULAR_CODES).
// `jubilee`/`ncrawler`/`storm`/`nova`: packs de héroe que el grupo tiene
// (decisión del usuario, 2026-10-02) y que solo aportan un modular cada uno;
// sus sets hero/nemesis/hero_special no son modular y la puerta los ignora.
const ENCOUNTER_PACKS = ['core', 'toafk', 'twc', 'tt', 'trors', 'jubilee', 'ncrawler', 'storm', 'nova']

// ENCOUNTER_MODULES (D-01): lista blanca a mano de los módulos de encuentro
// adicionales de esas cajas — nunca derivada automáticamente de la API,
// porque MarvelCDB no distingue "módulo adicional real" de otros
// `card_set_type_name_code: 'modular'` que no lo son en el sentido de esta
// app (ver `exp_kang` más abajo). `difficulty` (el número "Dificultad N"
// que Kang imprime en sus tres módulos) es dato a mano tomado del
// reglamento del grupo: las dificultades de los cinco módulos del Core Set
// no se conocen, así que esos cinco NO llevan la clave `difficulty` — nunca
// inventar un número.
const ENCOUNTER_MODULES = [
  { code: 'bomb_scare', pack: 'core' },
  { code: 'masters_of_evil', pack: 'core' },
  { code: 'under_attack', pack: 'core' },
  { code: 'legions_of_hydra', pack: 'core' },
  { code: 'the_doomsday_chair', pack: 'core' },
  { code: 'temporal', pack: 'toafk', difficulty: 4 },
  { code: 'mot', pack: 'toafk', difficulty: 6 },
  { code: 'anachronauts', pack: 'toafk', difficulty: 8 },
  // Sin `difficulty`: no hay fuente fiable de su dificultad y nunca se
  // inventa un número (mismo criterio que los cinco del Core Set).
  { code: 'trickster_magic', pack: 'tt' },
  // quick 261002-2am. Sin `difficulty`: no hay fuente fiable de su
  // dificultad, así que no se inventa ningún número (criterio del Core Set).
  { code: 'hydra_assault', pack: 'trors' },
  { code: 'weap_master', pack: 'trors' },
  { code: 'hydra_patrol', pack: 'trors' },
  { code: 'arcade', pack: 'jubilee' },
  { code: 'crazy_gang', pack: 'ncrawler' },
  { code: 'shadow_king', pack: 'storm' },
  { code: 'armadillo', pack: 'nova' },
]

// EXCLUDED_MODULAR_CODES (D-01): `card_set_code`s que MarvelCDB marca
// `card_set_type_name_code: 'modular'` pero que NO son un módulo adicional
// elegible en el sentido de esta app. `exp_kang` ("Kang Experto") es el set
// de villano de modo Experto de Kang — content/marvel-champions.json ya
// instruye sustituir esas cartas en la variante `expert` de
// `setup.escenario.04`; añadirlo como módulo adicional aquí duplicaría esa
// instrucción y confundiría al grupo (D-08: fuera de alcance de este quick).
// quick 261002-2am: `exper_weapon` (Armas Experimentales) es el conjunto FIJO
// del escenario de Crossbones (su 1A lo pide aparte, como mazo propio), no un
// módulo intercambiable; va a la línea de conjuntos vía fixedSetCodes (ver
// VILLAIN_SCENARIOS). `hydra_camp` y `expcamp` son solo de modo campaña, que
// está fuera de alcance (decisión del usuario).
const EXCLUDED_MODULAR_CODES = ['exp_kang', 'exper_weapon', 'hydra_camp', 'expcamp']

// Nota deliberada: no existe ninguna constante de espera/reintento aquí, a
// diferencia de scripts/voice/generate.mjs. MarvelCDB no tiene cuota ni 429
// documentado; un HTTP 500 en este API significa "código de carta
// inválido/inexistente", que es información sobre la que hay que abortar
// (D-05/D-06), no ruido transitorio que merezca un reintento con espera.

// HERO_CARDS — 24 filas, en este orden exacto (05-CONTEXT.md D-03: los 5 del
// Core Set primero, luego 19 de packs sueltos). El sufijo del `code` es
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
  { code: '48001a', expectedName: 'Nightcrawler' },
]

// VILLAIN_STAGE_CARDS — 31 filas, en este orden exacto (quick 260925-mpj,
// D-02: Klaw entra al catálogo — la exclusión deliberada del usuario que
// documentaba antes este comentario queda revertida por decisión explícita
// del usuario en ese quick).
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
// `expert` en esa etapa — eso significa "esta etapa no tiene cifras propias
// de un set de villano Experto" (Rhino, Ultron: sus etapas nunca la
// tienen), no "dato pendiente". Esta es la decisión explícita que
// 05-RESEARCH.md dejaba abierta al calificar `exp_kang` de fuera de
// alcance salvo decisión futura explícita.
const VILLAIN_STAGE_CARDS = [
  { villainName: 'Rhino', code: '01094', stage: 1, expectedSetCode: 'rhino' },
  { villainName: 'Rhino', code: '01095', stage: 2, expectedSetCode: 'rhino' },
  { villainName: 'Rhino', code: '01096', stage: 3, expectedSetCode: 'rhino' },
  // Klaw (quick 260925-mpj, D-02): verificado contra la API el día de este
  // quick — sin cifras Expertas propias (misma forma que Rhino/Ultron), su
  // Experto arranca en la etapa II (ver VILLAIN_SCENARIOS más abajo).
  { villainName: 'Klaw', code: '01113', stage: 1, expectedSetCode: 'klaw' },
  { villainName: 'Klaw', code: '01114', stage: 2, expectedSetCode: 'klaw' },
  { villainName: 'Klaw', code: '01115', stage: 3, expectedSetCode: 'klaw' },
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
  // Enchantress (quick 261001-obf): el pack no trae set de villano Experto;
  // su Experto cambia de etapa, como Rhino.
  { villainName: 'Enchantress', code: '55001', stage: 1, expectedSetCode: 'enchantress_villain' },
  { villainName: 'Enchantress', code: '55002', stage: 2, expectedSetCode: 'enchantress_villain' },
  { villainName: 'Enchantress', code: '55003', stage: 3, expectedSetCode: 'enchantress_villain' },
  // Loki (decisión del usuario 2026-10-01): seleccionable SIN la mecánica del
  // escenario (mismo espíritu que Brigada en 261001-o3p). Las cuatro formas
  // «Avatar of Loki» (55029a–55032a) no se declaran. La vida 20 por héroe
  // sale de la carta real a través de extractStageFields, no de un literal;
  // por eso Loki NO va en PLACEHOLDER_VILLAINS.
  { villainName: 'Loki', code: '55027a', stage: 1, expectedSetCode: 'god_of_lies' },
  // The Rise of Red Skull (quick 261002-2am): `trors` no trae set de villano
  // Experto con cifras propias, así que ninguna etapa lleva expertCode.
  { villainName: 'Crossbones', code: '04058', stage: 1, expectedSetCode: 'crossbones' },
  { villainName: 'Crossbones', code: '04059', stage: 2, expectedSetCode: 'crossbones' },
  { villainName: 'Crossbones', code: '04060', stage: 3, expectedSetCode: 'crossbones' },
  { villainName: 'Absorbing Man', code: '04076', stage: 1, expectedSetCode: 'absorbing_man' },
  { villainName: 'Absorbing Man', code: '04077', stage: 2, expectedSetCode: 'absorbing_man' },
  { villainName: 'Absorbing Man', code: '04078', stage: 3, expectedSetCode: 'absorbing_man' },
  { villainName: 'Taskmaster', code: '04093', stage: 1, expectedSetCode: 'taskmaster' },
  { villainName: 'Taskmaster', code: '04094', stage: 2, expectedSetCode: 'taskmaster' },
  { villainName: 'Taskmaster', code: '04095', stage: 3, expectedSetCode: 'taskmaster' },
  { villainName: 'Zola', code: '04109', stage: 1, expectedSetCode: 'zola' },
  { villainName: 'Zola', code: '04110', stage: 2, expectedSetCode: 'zola' },
  { villainName: 'Zola', code: '04111', stage: 3, expectedSetCode: 'zola' },
  { villainName: 'Red Skull', code: '04125', stage: 1, expectedSetCode: 'red_skull' },
  { villainName: 'Red Skull', code: '04126', stage: 2, expectedSetCode: 'red_skull' },
  { villainName: 'Red Skull', code: '04127', stage: 3, expectedSetCode: 'red_skull' },
]

// VILLAIN_SCENARIOS — una fila por villano (mismo orden que VILLAIN_STAGE_CARDS:
// rhino, klaw, kang, ultron, enchantress, loki, crossbones,
// absorbing-man, taskmaster, zola, red-skull), dato a mano de la etapa con la que empieza la
// partida en modo Experto (`expertStartStage`). Es dato A MANO, no
// derivado, porque el texto libre de la carta ("Rhino (II) and Rhino (III)
// instead for expert mode.") es frágil para parsear con confianza — la
// carta se usa solo como COMPROBACIÓN CRUZADA (`checkMainScheme`) del
// valor ya anotado aquí, nunca como fuente. Si la comprobación no coincide,
// `main()` aborta sin escribir nada (D-05).
//
// `mainSchemeCode`/`expectedMainSchemeName`/`expectedSetCode` identifican la
// cara 1A del plan principal de ese escenario (`type_code: main_scheme`),
// distinta de las cartas de etapa de villano de VILLAIN_STAGE_CARDS.
//
// `recommendedModuleCode` (quick 260925-mpj, D-03): `card_set_code` del
// módulo de encuentro recomendado por esa misma cara 1A — también dato a
// mano, también comprobado por `checkMainScheme` contra el texto de la
// carta ("One modular encounter set (recommended: ...)"), también aborta
// sin escribir si no coincide.
//
// Claves opcionales de fila (quick 261002-2am):
// - `expertStartStageSource: 'rulebook'`: la cara 1A no lista las etapas de
//   Experto pero el libro de reglas de la caja sí; el dato a mano se apoya
//   en el libro (cita de página en cada fila). checkMainScheme exige
//   entonces que la carta NO traiga la línea «instead for expert mode» y
//   que diga «X (I) and X (II)»; solo admite expertStartStage 2 («Remove
//   X (I) and add X (III)» equivale a arrancar en la II).
// - `additionalRecommendedModuleCodes`: card_set_code de los recomendados
//   2.º, 3.º… en el orden de la carta.
// - `fixedSetCodes`: card_set_code de los conjuntos fijos del escenario,
//   aparte del propio y del Standard (puede ser []). Si se declara,
//   checkMainScheme comprueba la línea de sets de la carta.
//
// Rhino, Ultron y Klaw (Core Set): `expertStartStage: 2` — la partida
// empieza en la etapa II en Experto, reutilizando sus propias cifras de esa
// etapa (sin set de villano Experto con cifras propias, por eso sus etapas
// nunca llevan `expert`).
// Kang: `expertStartStage: 1` — su Experto no cambia de etapa, va con las
// cifras propias del set `exp_kang` en la etapa I (ya modelado con
// `expert` por etapa); se anota explícitamente en 1 para que el dato sea
// un hecho declarado, no un valor implícito por omisión.
const VILLAIN_SCENARIOS = [
  { villainName: 'Rhino', mainSchemeCode: '01097a', expectedMainSchemeName: 'The Break-In!', expectedSetCode: 'rhino', expertStartStage: 2, recommendedModuleCode: 'bomb_scare' },
  { villainName: 'Klaw', mainSchemeCode: '01116a', expectedMainSchemeName: 'Underground Distribution', expectedSetCode: 'klaw', expertStartStage: 2, recommendedModuleCode: 'masters_of_evil' },
  { villainName: 'Kang', mainSchemeCode: '11007a', expectedMainSchemeName: "Kang's Arrival", expectedSetCode: 'kang', expertStartStage: 1, recommendedModuleCode: 'temporal' },
  { villainName: 'Ultron', mainSchemeCode: '01137a', expectedMainSchemeName: 'The Crimson Cowl', expectedSetCode: 'ultron', expertStartStage: 2, recommendedModuleCode: 'under_attack' },
  { villainName: 'Enchantress', mainSchemeCode: '55004a', expectedMainSchemeName: 'Prime Real Estate', expectedSetCode: 'enchantress_villain', expertStartStage: 2, recommendedModuleCode: 'trickster_magic' },
  // Loki: se usa la cara «A» (Worlds Collide) y no la 1A (Mischief and
  // Mayhem), porque en este escenario la línea Contents con el módulo vive en
  // la cara A. La 1A no trae Contents ni módulo; su único ajuste de Experto
  // es un apego (mecánica fuera de alcance), sin cambio de etapa. De ahí
  // expertStartStage 1.
  { villainName: 'Loki', mainSchemeCode: '55028a', expectedMainSchemeName: 'Worlds Collide', expectedSetCode: 'god_of_lies', expertStartStage: 1, recommendedModuleCode: 'trickster_magic' },
  // The Rise of Red Skull (quick 261002-2am). Las cinco 1A no listan Experto;
  // el libro de reglas de la caja (MC10en) dice «Remove X (I) and add X (III)
  // for expert mode» → expertStartStage 2.
  // Crossbones: libro, pág. 5. Errata RR v1.7 #61A («Hydra Patrol» →
  // «Hydra Assault»): MarvelCDB ya trae el texto corregido y, si volviera a
  // «Hydra Patrol», la comprobación aborta.
  { villainName: 'Crossbones', mainSchemeCode: '04061a', expectedMainSchemeName: 'Attack on Mount Athena', expectedSetCode: 'crossbones', expertStartStage: 2, expertStartStageSource: 'rulebook', recommendedModuleCode: 'hydra_assault', additionalRecommendedModuleCodes: ['weap_master', 'legions_of_hydra'], fixedSetCodes: ['exper_weapon'] },
  // Absorbing Man: libro, pág. 7.
  { villainName: 'Absorbing Man', mainSchemeCode: '04079a', expectedMainSchemeName: 'None Shall Pass', expectedSetCode: 'absorbing_man', expertStartStage: 2, expertStartStageSource: 'rulebook', recommendedModuleCode: 'hydra_patrol', fixedSetCodes: [] },
  // Taskmaster: libro, pág. 10; la Patrulla de Hydra es obligatoria aquí.
  { villainName: 'Taskmaster', mainSchemeCode: '04096a', expectedMainSchemeName: 'Hunting Down Heroes', expectedSetCode: 'taskmaster', expertStartStage: 2, expertStartStageSource: 'rulebook', recommendedModuleCode: 'weap_master', fixedSetCodes: ['hydra_patrol'] },
  // Zola: libro, pág. 12.
  { villainName: 'Zola', mainSchemeCode: '04112a', expectedMainSchemeName: 'The Island of Dr. Zola', expectedSetCode: 'zola', expertStartStage: 2, expertStartStageSource: 'rulebook', recommendedModuleCode: 'under_attack', fixedSetCodes: [] },
  // Red Skull: libro, pág. 15. Se usa 04128a, no la cara 1 04128, cuyo
  // nombre lleva «the».
  { villainName: 'Red Skull', mainSchemeCode: '04128a', expectedMainSchemeName: 'The Rise of Red Skull', expectedSetCode: 'red_skull', expertStartStage: 2, expertStartStageSource: 'rulebook', recommendedModuleCode: 'hydra_assault', additionalRecommendedModuleCodes: ['hydra_patrol'], fixedSetCodes: [] },
]

// PLACEHOLDER_VILLAINS (quick 261001-o3p) — escenario como villano placeholder.
// Decisión del usuario (2026-10-01, U-01..U-04): «Mételo en la selección de
// Villano, simplemente para las estadísticas y para el ciclo de cada
// jugador/villano y ya está, no hace falta poner la mecánica concreta de este
// escenario [...] ponle una vida inicial de 00 por poner algo y ya está».
// - Sus villanos reales (p. ej. 07002 Wrecker A, 07017, 07032, 07046 y sus B)
//   NO se descargan ni se modelan.
// - Su única etapa es SIEMPRE `PLACEHOLDER_STAGE`: literal fijo del script,
//   no viene de ninguna carta; el grupo ajusta la banda de contadores a mano.
// - `expertStartStage` vale 1 y no hay `recommendedModuleId`, porque la hoja
//   del escenario prohíbe otros conjuntos de encuentro.
// - El plan principal solo se usa como comprobación cruzada de identidad
//   (tipo, nombre y set) en `checkMainSchemeIdentity`. No se buscan las
//   líneas «instead for expert mode» ni «One modular encounter set», porque
//   la carta no las trae.
// - Ningún texto de carta entra al catálogo (CAT-04): el `encounterSetName`
//   sale del `card_set_name` español del set, ya en la lista blanca.
// Para añadir otro (p. ej. un segundo escenario placeholder) basta otra fila.
const PLACEHOLDER_STAGE = Object.freeze({ stage: 1, health: 0, healthPerHero: false, healthPerGroup: false })
const PLACEHOLDER_VILLAINS = [
  { villainName: 'Brigada de Demolición', mainSchemeCode: '07001a', expectedMainSchemeName: 'Breakout', expectedSetCode: 'wrecking_crew' },
]

// ── Funciones ────────────────────────────────────────────────────────────────

// Copia exacta de `slugifyCharacterName()` en engine/catalogueSchema.ts. Si
// las dos funciones divergen, el esquema de esa fase rechaza el `id` que
// produce este script y CI falla — eso es a propósito (DC-02 del plan
// 05-01): las dos deben coincidir carácter a carácter. Ejemplo:
// "Brigada de Demolición" produce "brigada-de-demolicion" (plegado NFD).
function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

// fetchPackEncounterSets (quick 260925-mpj, D-01/CAT-04): descarga TODAS las
// cartas de encuentro de un pack de una tirada (`?encounter=1`) y devuelve
// un Map `card_set_code` → `{ name, type, pack }`, leyendo SOLO esas tres
// claves de cada carta (`card_set_name`/`card_set_type_name_code`/
// `pack_code`) — lista blanca campo a campo, igual que el resto del script;
// ninguna otra clave de la carta entra en el Map. Cartas sin `card_set_code`
// se ignoran. Mismas reglas de error y el mismo pacing que `fetchCard`.
async function fetchPackEncounterSets(apiBase, pack) {
  const response = await fetch(`${apiBase}/cards/${pack}.json?encounter=1`)
  if (!response.ok) {
    const bodyText = await response.text().catch(() => '')
    throw new Error(`Pack ${pack} (${apiBase}): MarvelCDB respondió HTTP ${response.status}. Cuerpo (primeros 200 caracteres): ${bodyText.slice(0, 200)}`)
  }
  const json = await response.json()
  await sleep(REQUEST_DELAY_MS)
  const sets = new Map()
  for (const card of json) {
    const code = card.card_set_code
    if (!code) continue
    if (!sets.has(code)) {
      sets.set(code, { name: card.card_set_name, type: card.card_set_type_name_code, pack: card.pack_code })
    }
  }
  return sets
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

// Comprobación cruzada (T-m2k-01, ampliada en el quick 260925-mpj con la
// puerta del módulo recomendado): el dato a mano de VILLAIN_SCENARIOS
// manda; esta función solo confirma que sigue coincidiendo con el texto de
// la cara 1A del plan principal en MarvelCDB. Nunca copia texto de carta al
// catálogo (CAT-04) — el `text` de la carta solo se usa para comparar en
// memoria dentro de esta función, y nada de él sale de aquí.
//
// `englishSets` (quick 260925-mpj): Map combinado `card_set_code` → info EN
// de TODOS los packs, ya descargado por `fetchPackEncounterSets` antes de
// llamar aquí — permite resolver el nombre inglés de
// `row.recommendedModuleCode` sin una petición de red adicional.
async function checkMainSchemeIdentity({ villainName, mainSchemeCode, expectedMainSchemeName, expectedSetCode }) {
  const card = await fetchCard(mainSchemeCode)
  if (card.type_code !== 'main_scheme') {
    throw new Error(`Código ${mainSchemeCode} (${villainName}, plan principal): se esperaba type_code "main_scheme" pero la API devolvió "${card.type_code}"`)
  }
  if (card.name !== expectedMainSchemeName) {
    throw new Error(`Código ${mainSchemeCode} (${villainName}, plan principal): se esperaba name "${expectedMainSchemeName}" pero la API devolvió "${card.name}"`)
  }
  if (card.card_set_code !== expectedSetCode) {
    throw new Error(`Código ${mainSchemeCode} (${villainName}, plan principal): se esperaba card_set_code "${expectedSetCode}" pero la API devolvió "${card.card_set_code}"`)
  }
  return card
}

// Parte una lista de nombres de carta («A, B, and C», «A and B», «A») en
// trozos recortados (quick 261002-2am).
function splitCardList(fragment) {
  return fragment
    .split(/,\s*and\s+|,\s*|\s+and\s+/)
    .map(part => part.trim())
    .filter(part => part !== '')
}

async function checkMainScheme(row, englishSets) {
  const { villainName, mainSchemeCode, expertStartStage, recommendedModuleCode } = row
  const card = await checkMainSchemeIdentity(row)

  // Quita etiquetas HTML (Ultron trae el fragmento envuelto en <i>...</i>)
  // antes de buscar el patrón — ninguna etiqueta ni el texto en sí entra al
  // catálogo, solo se usan aquí para comparar.
  const text = (card.text ?? '').replace(/<[^>]+>/g, '')
  // La retro-referencia \1 exige el MISMO nombre de villano en las dos
  // etapas del paréntesis ("Rhino (II) and Rhino (III) instead for expert
  // mode."), para no confundirse con el nombre de otro villano.
  const expertModeRegex = /\(\s*(.+?) \((I{1,3})\) and \1 \((I{1,3})\) instead for expert mode\.?\s*\)/
  const match = text.match(expertModeRegex)

  if (row.expertStartStageSource === 'rulebook') {
    // La carta no lista Experto; el dato a mano sale del libro de reglas de
    // la caja. Si la carta ya lo lista, hay que usarla como fuente.
    if (match) {
      throw new Error(`Fila ${villainName}: expertStartStageSource es 'rulebook' pero la carta ${mainSchemeCode} YA lista el modo Experto ("${match[0]}") — usa la carta como fuente`)
    }
    const contentsMatch = text.match(/Contents:\s*(.+?) \(I\) and \1 \(II\)/)
    if (!contentsMatch || contentsMatch[1] !== villainName) {
      throw new Error(`Fila ${villainName}: la carta ${mainSchemeCode} no trae «Contents: ${villainName} (I) and ${villainName} (II)» (encontrado: ${contentsMatch ? contentsMatch[1] : 'nada'})`)
    }
  }
  else if (expertStartStage === 1) {
    // Sin sustitución de etapa en Experto (caso Kang, va con su propio set
    // exp_kang): la carta NO debe traer la línea "instead for expert mode".
    // Si la trae, el dato a mano quedó desfasado.
    if (match) {
      throw new Error(`Fila ${villainName}: expertStartStage a mano es 1 (sin cambio de etapa) pero la carta ${mainSchemeCode} SÍ trae una línea "instead for expert mode" ("${match[0]}") — el dato a mano está desfasado`)
    }
  }
  else if (!match) {
    throw new Error(`Fila ${villainName}: expertStartStage a mano es ${expertStartStage} pero la carta ${mainSchemeCode} no trae ninguna línea "instead for expert mode" que lo respalde`)
  }
  else {
    const [fragment, matchedName, expertStageRoman] = match
    if (matchedName !== villainName) {
      throw new Error(`Fila ${villainName}: la línea de Experto de la carta ${mainSchemeCode} nombra a "${matchedName}", no a "${villainName}" ("${fragment}")`)
    }
    const mappedStage = STAGE_MAP[expertStageRoman]
    if (mappedStage === undefined) {
      throw new Error(`Fila ${villainName}: la carta ${mainSchemeCode} trae un valor de etapa Experta no mapeable ("${expertStageRoman}", fragmento "${fragment}")`)
    }
    if (mappedStage !== expertStartStage) {
      throw new Error(`Fila ${villainName}: expertStartStage a mano es ${expertStartStage} pero la carta ${mainSchemeCode} dice etapa ${mappedStage} ("${fragment}")`)
    }
  }

  // Puerta del módulo recomendado (quick 260925-mpj, D-03/T-mpj-03; ampliada
  // en 261002-2am a varios): busca "One|Two|Three modular (encounter) set(s)
  // (...)" — 55004a dice «One modular set (...)», sin «encounter». Con o sin
  // el prefijo "recommended:" — Kang no lo lleva porque su único modular es
  // fijo. La lista capturada, partida y recortada, debe coincidir EXACTAMENTE
  // y en orden con los nombres ingleses de los módulos a mano, y su recuento
  // con la palabra One/Two/Three.
  const recommendedRegex = /(One|Two|Three) modular (?:encounter )?sets? \((?:recommended:\s*)?([^)]+?)\.?\s*\)/
  const recommendedMatch = text.match(recommendedRegex)
  if (!recommendedMatch) {
    throw new Error(`Fila ${villainName}: no se encontró la línea "One|Two|Three modular [encounter] set(s) (...)" en la carta ${mainSchemeCode} para comprobar el módulo recomendado`)
  }
  const countWords = { One: 1, Two: 2, Three: 3 }
  const cardList = splitCardList(recommendedMatch[2])
  if (cardList.length !== countWords[recommendedMatch[1]]) {
    throw new Error(`Fila ${villainName}: la carta ${mainSchemeCode} dice "${recommendedMatch[1]}" módulos pero la lista trae ${cardList.length} ("${recommendedMatch[2]}")`)
  }
  const expectedCodes = [recommendedModuleCode, ...(row.additionalRecommendedModuleCodes ?? [])]
  const expectedNames = expectedCodes.map((code) => {
    const name = englishSets.get(code)?.name
    if (name === undefined) {
      throw new Error(`Fila ${villainName}: el módulo "${code}" no se encontró entre los módulos descargados de MarvelCDB`)
    }
    return name
  })
  if (JSON.stringify(cardList) !== JSON.stringify(expectedNames)) {
    throw new Error(`Fila ${villainName}: los módulos recomendados a mano son [${expectedNames.join(', ')}] pero la carta ${mainSchemeCode} dice [${cardList.join(', ')}] — el dato a mano está desfasado`)
  }

  // Conjuntos fijos (quick 261002-2am): si la fila los declara (aunque sea
  // []), la línea de sets de la carta debe ser, en orden, el set del villano,
  // los fijos y «Standard». Crossbones escribe «Encounter» con mayúscula.
  if (row.fixedSetCodes !== undefined) {
    const setsMatch = text.match(/\(II\)\.\s*(.+?) [Ee]ncounter sets\./)
    if (!setsMatch) {
      throw new Error(`Fila ${villainName}: no se encontró la línea "... (II). X, Y, and Standard encounter sets." (patrón /\\(II\\)\\.\\s*(.+?) [Ee]ncounter sets\\./) en la carta ${mainSchemeCode}`)
    }
    const setList = splitCardList(setsMatch[1])
    const expectedSetCodes = [row.expectedSetCode, ...row.fixedSetCodes]
    const expectedSetNames = expectedSetCodes.map((code) => {
      const name = englishSets.get(code)?.name
      if (name === undefined) {
        throw new Error(`Fila ${villainName}: el set "${code}" no se encontró entre los sets descargados de MarvelCDB`)
      }
      return name
    })
    expectedSetNames.push('Standard')
    if (JSON.stringify(setList) !== JSON.stringify(expectedSetNames)) {
      throw new Error(`Fila ${villainName}: los conjuntos a mano son [${expectedSetNames.join(', ')}] pero la carta ${mainSchemeCode} dice [${setList.join(', ')}] — el dato a mano está desfasado`)
    }
  }
}

function writeCatalogue(heroes, villains, baseSets, modules) {
  const catalogue = { gameId: GAME_ID, heroes, villains, baseSets, modules }
  // Sin ordenación alfabética (el orden es el declarado en HERO_CARDS /
  // VILLAIN_STAGE_CARDS / ENCOUNTER_MODULES, D-04) y sin ningún campo de
  // fecha (D-10).
  writeFile(CATALOGUE_PATH, `${JSON.stringify(catalogue, null, 2)}\n`)
}

async function main() {
  // D-05/D-09: los ~88 códigos (24 héroes + 31 etapas estándar + 3 etapas
  // Experto de Kang + 12 cartas de plan principal para checkMainScheme y
  // checkMainSchemeIdentity + 18 descargas de pack: 9 packs EN/ES) se resuelven EN
  // MEMORIA COMPLETA antes de escribir nada. Solo si todos tuvieron éxito se
  // llama a writeCatalogue. Ninguna escritura parcial de
  // content/marvel-characters.json puede ocurrir jamás — diferencia
  // deliberada respecto a scripts/voice/generate.mjs, que escribe
  // incrementalmente (ese script es reanudable por diseño; este es todo o
  // nada). Con el pacing de REQUEST_DELAY_MS (1500 ms) esto tarda ~140 s
  // (unas 88 peticiones: 24 héroes + 31 etapas estándar + 3 Experto de Kang
  // + 12 planes principales + 18 descargas de pack en EN/ES).

  // Guarda previa a cualquier petición de red (D-05: fallar alto antes que
  // gastar peticiones): el conjunto de villainName de VILLAIN_SCENARIOS y de
  // VILLAIN_STAGE_CARDS debe coincidir exactamente, y expertStartStage debe
  // ser un entero entre 1 y el número de etapas que ese villano declara.
  const villainNamesFromStages = new Set(VILLAIN_STAGE_CARDS.map(row => row.villainName))
  const villainNamesFromScenarios = new Set(VILLAIN_SCENARIOS.map(row => row.villainName))
  for (const name of villainNamesFromStages) {
    if (!villainNamesFromScenarios.has(name)) {
      throw new Error(`VILLAIN_SCENARIOS no tiene ninguna fila para "${name}" (sí presente en VILLAIN_STAGE_CARDS)`)
    }
  }
  for (const name of villainNamesFromScenarios) {
    if (!villainNamesFromStages.has(name)) {
      throw new Error(`VILLAIN_SCENARIOS tiene una fila para "${name}" que no existe en VILLAIN_STAGE_CARDS`)
    }
  }
  for (const row of VILLAIN_SCENARIOS) {
    const stageCount = VILLAIN_STAGE_CARDS.filter(s => s.villainName === row.villainName).length
    if (!Number.isInteger(row.expertStartStage) || row.expertStartStage < 1 || row.expertStartStage > stageCount) {
      throw new Error(`VILLAIN_SCENARIOS: "${row.villainName}" tiene expertStartStage ${row.expertStartStage}, fuera de rango 1..${stageCount}`)
    }
  }

  // Guardas de PLACEHOLDER_VILLAINS (quick 261001-o3p), antes de la red.
  {
    const realSlugs = new Set([
      ...VILLAIN_STAGE_CARDS.map(row => slugify(row.villainName)),
      ...VILLAIN_SCENARIOS.map(row => slugify(row.villainName)),
    ])
    const seen = new Set()
    for (const row of PLACEHOLDER_VILLAINS) {
      const slug = slugify(row.villainName)
      if (slug === '') {
        throw new Error(`PLACEHOLDER_VILLAINS: "${row.villainName}" produce un slug vacío`)
      }
      if (realSlugs.has(slug)) {
        throw new Error(`PLACEHOLDER_VILLAINS: "${row.villainName}" (slug "${slug}") coincide con un villano real de VILLAIN_STAGE_CARDS/VILLAIN_SCENARIOS`)
      }
      if (seen.has(slug)) {
        throw new Error(`PLACEHOLDER_VILLAINS: slug "${slug}" repetido entre placeholders`)
      }
      seen.add(slug)
    }
  }

  // Guardas de ENCOUNTER_MODULES (quick 260925-mpj, D-01), también antes de
  // cualquier petición de red.
  const moduleCodes = ENCOUNTER_MODULES.map(m => m.code)
  const dupeModuleCodes = moduleCodes.filter((code, i) => moduleCodes.indexOf(code) !== i)
  if (dupeModuleCodes.length) {
    throw new Error(`ENCOUNTER_MODULES tiene códigos duplicados: ${[...new Set(dupeModuleCodes)].join(', ')}`)
  }
  for (const module of ENCOUNTER_MODULES) {
    if (module.difficulty !== undefined && (!Number.isInteger(module.difficulty) || module.difficulty <= 0)) {
      throw new Error(`ENCOUNTER_MODULES: "${module.code}" tiene difficulty ${module.difficulty}, debe ser un entero positivo`)
    }
  }
  for (const row of VILLAIN_SCENARIOS) {
    if (!moduleCodes.includes(row.recommendedModuleCode)) {
      throw new Error(`VILLAIN_SCENARIOS: "${row.villainName}" declara recommendedModuleCode "${row.recommendedModuleCode}", que no está en ENCOUNTER_MODULES`)
    }
  }
  for (const row of VILLAIN_SCENARIOS) {
    if (row.expertStartStageSource !== undefined && row.expertStartStageSource !== 'rulebook') {
      throw new Error(`VILLAIN_SCENARIOS: "${row.villainName}" tiene expertStartStageSource "${row.expertStartStageSource}"; solo se admite 'rulebook'`)
    }
    if (row.expertStartStageSource === 'rulebook' && row.expertStartStage !== 2) {
      throw new Error(`VILLAIN_SCENARIOS: "${row.villainName}" usa 'rulebook' con expertStartStage ${row.expertStartStage}; debe ser 2`)
    }
    const additional = row.additionalRecommendedModuleCodes ?? []
    if (new Set(additional).size !== additional.length) {
      throw new Error(`VILLAIN_SCENARIOS: "${row.villainName}" repite códigos en additionalRecommendedModuleCodes`)
    }
    for (const code of additional) {
      if (!moduleCodes.includes(code)) {
        throw new Error(`VILLAIN_SCENARIOS: "${row.villainName}" declara additionalRecommendedModuleCodes "${code}", que no está en ENCOUNTER_MODULES`)
      }
      if (code === row.recommendedModuleCode) {
        throw new Error(`VILLAIN_SCENARIOS: "${row.villainName}" repite recommendedModuleCode "${code}" en additionalRecommendedModuleCodes`)
      }
    }
    if (row.fixedSetCodes !== undefined) {
      if (!Array.isArray(row.fixedSetCodes) || new Set(row.fixedSetCodes).size !== row.fixedSetCodes.length) {
        throw new Error(`VILLAIN_SCENARIOS: "${row.villainName}" tiene fixedSetCodes que no es un array sin duplicados`)
      }
      for (const code of row.fixedSetCodes) {
        if (code === row.expectedSetCode || code === 'standard' || code === row.recommendedModuleCode || additional.includes(code)) {
          throw new Error(`VILLAIN_SCENARIOS: "${row.villainName}" tiene fixedSetCodes "${code}", que coincide con su propio set, con 'standard' o con un recomendado`)
        }
      }
    }
  }
  for (const code of moduleCodes) {
    if (EXCLUDED_MODULAR_CODES.includes(code)) {
      throw new Error(`ENCOUNTER_MODULES contiene "${code}", que también está en EXCLUDED_MODULAR_CODES — un módulo no puede estar en las dos listas a la vez`)
    }
  }

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

  // Descarga de los packs de encuentro en EN y ES (4 peticiones, quick
  // 260925-mpj) — resueltas en memoria antes de cualquier validación que las
  // use, igual que heroes/villainStagesById de arriba.
  const englishSetsByPack = new Map()
  const spanishSetsByPack = new Map()
  for (const pack of ENCOUNTER_PACKS) {
    englishSetsByPack.set(pack, await fetchPackEncounterSets(API_BASE, pack))
    spanishSetsByPack.set(pack, await fetchPackEncounterSets(API_BASE_ES, pack))
  }

  // Todo card_set_code de tipo 'modular' presente en los packs descargados
  // debe estar en ENCOUNTER_MODULES o en EXCLUDED_MODULAR_CODES — si
  // aparece uno nuevo, la lista a mano quedó incompleta y hay que abortar
  // (nunca adivinar si es elegible).
  for (const pack of ENCOUNTER_PACKS) {
    for (const [code, info] of englishSetsByPack.get(pack)) {
      if (info.type !== 'modular') continue
      const known = moduleCodes.includes(code) || EXCLUDED_MODULAR_CODES.includes(code)
      if (!known) {
        throw new Error(`Pack ${pack} trae un card_set_code modular desconocido: "${code}" (${info.name}) — añade una fila a ENCOUNTER_MODULES o a EXCLUDED_MODULAR_CODES`)
      }
    }
  }

  // Cada módulo de ENCOUNTER_MODULES existe en los dos idiomas, con type
  // 'modular' y en el pack declarado.
  for (const module of ENCOUNTER_MODULES) {
    const englishInfo = englishSetsByPack.get(module.pack)?.get(module.code)
    const spanishInfo = spanishSetsByPack.get(module.pack)?.get(module.code)
    if (!englishInfo || englishInfo.type !== 'modular' || englishInfo.pack !== module.pack) {
      throw new Error(`Módulo "${module.code}": no se encontró en el pack EN "${module.pack}" con type modular (encontrado: ${JSON.stringify(englishInfo)})`)
    }
    if (!spanishInfo || spanishInfo.type !== 'modular' || spanishInfo.pack !== module.pack) {
      throw new Error(`Módulo "${module.code}": no se encontró en el pack ES "${module.pack}" con type modular (encontrado: ${JSON.stringify(spanishInfo)})`)
    }
  }

  // El set de cada villano (expectedSetCode de VILLAIN_SCENARIOS) existe en
  // ES con type 'villain' — su card_set_name es encounterSetName.
  function findInAnyPack(setsByPack, code) {
    for (const sets of setsByPack.values()) {
      if (sets.has(code)) return sets.get(code)
    }
    return undefined
  }

  const encounterSetNameByVillainName = new Map()
  for (const row of VILLAIN_SCENARIOS) {
    const info = findInAnyPack(spanishSetsByPack, row.expectedSetCode)
    if (!info || info.type !== 'villain') {
      throw new Error(`Villano "${row.villainName}": no se encontró el set "${row.expectedSetCode}" con type villain en ES (encontrado: ${JSON.stringify(info)})`)
    }
    encounterSetNameByVillainName.set(row.villainName, info.name)
  }

  // Cada placeholder: su set existe en ES con type 'villain' y su nombre
  // impreso coincide (sin distinguir mayúsculas) con el rótulo a mano.
  for (const row of PLACEHOLDER_VILLAINS) {
    const info = findInAnyPack(spanishSetsByPack, row.expectedSetCode)
    if (!info || info.type !== 'villain') {
      throw new Error(`Placeholder "${row.villainName}": no se encontró el set "${row.expectedSetCode}" con type villain en ES (encontrado: ${JSON.stringify(info)})`)
    }
    if (info.name.toLocaleLowerCase('es') !== row.villainName.toLocaleLowerCase('es')) {
      throw new Error(`Placeholder "${row.villainName}": el card_set_name español del set "${row.expectedSetCode}" es "${info.name}", no coincide con el rótulo a mano`)
    }
    encounterSetNameByVillainName.set(row.villainName, info.name)
  }

  // ES 'standard' y 'expert' existen y valen exactamente «Normal»/«Experto»
  // — copia que el usuario fijó; si MarvelCDB cambia, abortar en vez de
  // escribir un nombre distinto en silencio.
  const standardInfo = findInAnyPack(spanishSetsByPack, 'standard')
  const expertBaseInfo = findInAnyPack(spanishSetsByPack, 'expert')
  if (!standardInfo || standardInfo.type !== 'standard' || standardInfo.name !== 'Normal') {
    throw new Error(`El set base "standard" en ES no es exactamente "Normal" (encontrado: ${JSON.stringify(standardInfo)})`)
  }
  if (!expertBaseInfo || expertBaseInfo.type !== 'expert' || expertBaseInfo.name !== 'Experto') {
    throw new Error(`El set base "expert" en ES no es exactamente "Experto" (encontrado: ${JSON.stringify(expertBaseInfo)})`)
  }

  // Map combinado EN (todos los packs) para que checkMainScheme resuelva el
  // nombre inglés de cualquier recommendedModuleCode sin una petición
  // adicional — los códigos de módulo ya se comprobaron únicos arriba.
  const combinedEnglishSets = new Map()
  for (const sets of englishSetsByPack.values()) {
    for (const [code, info] of sets) combinedEnglishSets.set(code, info)
  }

  // checkMainScheme compara el dato a mano (expertStartStage y
  // recommendedModuleCode) contra la carta 1A del plan principal DESPUÉS de
  // tener las etapas y los packs de encuentro ya resueltos (para que un
  // fallo de red temprano no oculte un dato a mano desfasado, y viceversa:
  // los dos tipos de fallo abortan igual, sin escribir nada).
  for (const row of VILLAIN_SCENARIOS) {
    await checkMainScheme(row, combinedEnglishSets)
  }

  for (const row of PLACEHOLDER_VILLAINS) {
    await checkMainSchemeIdentity(row)
  }

  // expertStartStage/encounterSetName/recommendedModuleId se añaden DESPUÉS
  // de stages (orden de claves determinista, D-10), para TODOS los
  // villanos — también Kang en expertStartStage 1, para que el dato quede
  // explícito en vez de implícito por omisión.
  const villains = villainOrder.map((id) => {
    const villain = villainStagesById.get(id)
    const scenario = VILLAIN_SCENARIOS.find(row => slugify(row.villainName) === id)
    const output = {
      ...villain,
      expertStartStage: scenario.expertStartStage,
      encounterSetName: encounterSetNameByVillainName.get(scenario.villainName),
      recommendedModuleId: scenario.recommendedModuleCode.replace(/_/g, '-'),
    }
    // Asignación condicional, nunca una clave a `undefined` (D-10).
    const additional = scenario.additionalRecommendedModuleCodes ?? []
    if (additional.length > 0) {
      output.additionalRecommendedModuleIds = additional.map(code => code.replace(/_/g, '-'))
    }
    const fixed = scenario.fixedSetCodes ?? []
    if (fixed.length > 0) {
      output.fixedEncounterSetNames = fixed.map((code) => {
        const info = findInAnyPack(spanishSetsByPack, code)
        if (!info) {
          throw new Error(`Villano "${scenario.villainName}": el conjunto fijo "${code}" no se encontró en ES`)
        }
        return info.name
      })
    }
    return output
  })
  // Placeholders al final, sin clave recommendedModuleId (ni como undefined).
  for (const row of PLACEHOLDER_VILLAINS) {
    villains.push({
      id: slugify(row.villainName),
      name: row.villainName,
      stages: [{ ...PLACEHOLDER_STAGE }],
      expertStartStage: 1,
      encounterSetName: encounterSetNameByVillainName.get(row.villainName),
    })
  }

  const baseSets = { standard: standardInfo.name, expert: expertBaseInfo.name }
  const modules = ENCOUNTER_MODULES.map((module) => {
    const spanishInfo = spanishSetsByPack.get(module.pack).get(module.code)
    const output = { id: module.code.replace(/_/g, '-'), name: spanishInfo.name }
    // Asignación condicional, nunca `undefined` explícito (CAT-04): los
    // cinco módulos de core no llevan difficulty en absoluto.
    if (module.difficulty !== undefined) output.difficulty = module.difficulty
    return output
  })

  writeCatalogue(heroes, villains, baseSets, modules)
  console.log(`Escritos ${heroes.length} héroes, ${villains.length} villanos y ${modules.length} módulos en ${CATALOGUE_PATH}`)
}

main().catch((error) => {
  console.error(error.message)
  console.error('No se ha escrito nada en content/marvel-characters.json (D-05).')
  process.exit(1)
})
