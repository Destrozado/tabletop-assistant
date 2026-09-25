---
phase: quick-260925-mpj
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/catalogue/fetch-marvelcdb.mjs
  - content/marvel-characters.json
  - engine/types.ts
  - engine/catalogueSchema.ts
  - engine/schema.ts
  - engine/encounterSets.ts
  - engine/selection.ts
  - engine/stepValues.ts
  - content/marvel-champions.json
  - app/composables/useGameSession.ts
  - app/components/ModulePickerModal.vue
  - app/components/StepScreen.vue
  - app/pages/[game]/index.vue
  - engine/__tests__/catalogueSchema.test.ts
  - engine/__tests__/characters.test.ts
  - engine/__tests__/counters.test.ts
  - engine/__tests__/encounterSets.test.ts
  - engine/__tests__/selection.test.ts
  - engine/__tests__/stepValues.test.ts
  - engine/__tests__/persistence.test.ts
  - engine/__tests__/content.test.ts
  - app/composables/__tests__/useGameSession.test.ts
autonomous: true
requirements: [QUICK-260925-mpj]

must_haves:
  truths:
    - "El villano Klaw se puede elegir en la rejilla y su vida inicial sale del catálogo: Normal 2 jugadores = 24 (Klaw I, 12 por jugador), Experto 2 jugadores = 36 (Klaw II, 18 por jugador)"
    - "La rejilla de setup.heroes.01 tiene una fila «Módulos» justo después de «Villano», con los nombres españoles elegidos separados por comas o «—» si no hay ninguno"
    - "Tocar la fila «Módulos» abre un modal «Módulos» con los sets base informativos («Normal», y «Experto» solo en dificultad Experto) y la sección «Módulos adicionales» con casillas multiselección"
    - "El módulo recomendado del villano elegido sale primero con la etiqueta «Recomendado»; «Dificultad N» solo aparece en Temporal (4), Amo del tiempo (6) y Anacronautas (8)"
    - "Al elegir villano, la selección por defecto es su módulo recomendado; cambiar a otro villano la reinicia al recomendado del nuevo; volver a tocar el mismo villano no la toca"
    - "La selección de módulos sobrevive a recargar la página; una partida guardada antes de este cambio se reanuda sin error (sin moduleIds = recomendado del villano o ninguno)"
    - "El paso setup.encuentros.01 muestra bajo la frase una línea tipo «Rino · Normal · Experto · Amenaza de bomba»; sin villano ni módulos no muestra nada; ningún `speech` cambia"
    - "El script de catálogo aborta sin escribir si el módulo recomendado anotado a mano no coincide con la carta 1A del plan principal"
  artifacts:
    - path: "content/marvel-characters.json"
      provides: "Klaw, baseSets, modules, encounterSetName y recommendedModuleId por villano"
      contains: "\"recommendedModuleId\""
    - path: "engine/encounterSets.ts"
      provides: "resolveModuleIds, orderModulesForVillain, resolveEncounterSetNames, toggleModule"
      exports: ["resolveModuleIds", "orderModulesForVillain", "resolveEncounterSetNames", "toggleModule"]
    - path: "app/components/ModulePickerModal.vue"
      provides: "Modal «Módulos» multiselección"
      min_lines: 60
    - path: "engine/__tests__/encounterSets.test.ts"
      provides: "Tests de resolución por defecto, validación defensiva, orden y línea de conjuntos"
  key_links:
    - from: "app/pages/[game]/index.vue"
      to: "ModulePickerModal"
      via: "activeSelectionModal kind 'modules' abierto desde onSelectRow('modules')"
      pattern: "kind === 'modules'"
    - from: "app/composables/useGameSession.ts"
      to: "engine/encounterSets.ts"
      via: "toggleModule / resolveModuleIds / orderModulesForVillain"
      pattern: "from '~~/engine/encounterSets'"
    - from: "content/marvel-champions.json setup.encuentros.01"
      to: "engine/stepValues.ts resolveStepValueText"
      via: "\"value\": \"encounterSets\""
      pattern: "\"value\": \"encounterSets\""
    - from: "scripts/catalogue/fetch-marvelcdb.mjs"
      to: "carta 1A del plan principal"
      via: "checkMainScheme comprueba expertStartStage y recommendedModuleCode"
      pattern: "recommendedModuleCode"
---

<objective>
Añadir al catálogo los módulos de encuentro de las cajas del grupo (Core Set + «Antiguo y futuro Kang») y el villano Klaw; dejar que el grupo elija módulos en la rejilla de selección (con el recomendado del villano por defecto), guardar esa elección en la sesión, y que el paso setup.encuentros.01 nombre en pantalla qué conjuntos sacar de la caja.

Purpose: el usuario guarda por separado set Normal, set Experto y módulos; la app le dice exactamente qué reunir. Klaw era el único villano de la caja básica que faltaba.
Output: catálogo regenerado, módulo de motor `engine/encounterSets.ts`, modal `ModulePickerModal.vue`, fila «Módulos», línea de conjuntos en setup.encuentros.01, tests.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md
@.planning/todos/pending/2026-09-25-selector-de-modulos-de-encuentro.md
@.planning/quick/260925-m2k-vida-inicial-del-villano-en-experto-desd/260925-m2k-SUMMARY.md

<locked_decisions>
Decisiones cerradas con el usuario (D-01..D-08 de este quick). No reinterpretar.
- D-01 Lista de módulos = solo las cajas del usuario, packs MarvelCDB `core` y `toafk`. core: bomb_scare, masters_of_evil, under_attack, legions_of_hydra, the_doomsday_chair (dificultad desconocida → sin número). toafk: temporal (4), mot (6), anachronauts (8) — dificultades a mano, dadas por el usuario desde el reglamento de Kang. `exp_kang` («Kang Experto») viene marcado como modular en MarvelCDB pero es el set de villano Experto de Kang: EXCLUIDO de la lista. Sets base: `standard` «Normal», `expert` «Experto».
- D-02 Añadir Klaw (core, set `klaw`). Etapas: 01113 (I, 12, per hero), 01114 (II, 18, per hero), 01115 (III, 22, per hero) — verificado hoy en la API. Plan principal 1A `01116a`, nombre en la API inglesa «Underground Distribution» (su nombre español es «Distribución clandestina», pero `expectedMainSchemeName` compara contra la API inglesa como las otras filas). expertStartStage 2. Nombre de villano en el catálogo = nombre inglés de MarvelCDB tal cual: «Klaw».
- D-03 Módulo recomendado por villano, dato a mano en VILLAIN_SCENARIOS y comprobado contra el texto de la cara 1A (aborta si no coincide): Rhino → bomb_scare («(recommended: Bomb Scare)»), Klaw → masters_of_evil («(recommended: Masters of Evil)»), Ultron → under_attack («(recommended: Under Attack)»), Kang → temporal (11007a trae «One modular encounter set <em>(Temporal).</em>», sin la palabra recommended).
- D-04 UI: fila nueva «Módulos» en la rejilla de selección, justo después de «Villano»; valor = nombres españoles elegidos unidos por «, » o «—». Tocarla abre un modal «Módulos» calcado de VillainPickerModal: sección de sets base informativa (no pulsable) con «Normal» y, solo en Experto, «Experto»; sección «Módulos adicionales» con casillas multiselección (cero o más); recomendado primero con etiqueta «Recomendado»; «Dificultad N» solo cuando se conoce.
- D-05 Por defecto, al elegir villano (sin personalización para ese villano) selección = [recomendado]. Cambiar de villano reinicia al recomendado del nuevo. Sin villano → nada preseleccionado, la fila sigue siendo usable.
- D-06 Persistencia en la sesión (SessionContext.selection), validación defensiva del localStorage (ids desconocidos descartados, no-array → valor por defecto), partidas antiguas sin el campo → valor por defecto. Mutadores puros e inmutables (objeto nuevo en cada nivel, D-20 / SEL-08).
- D-07 setup.encuentros.01 muestra una línea con lo que hay que reunir («Rino · Normal · Experto · Amenaza de bomba»): nombre español del set del villano + Normal + Experto si Experto + módulos elegidos, mediante el mecanismo `value` de paso (nuevo StepValueKind `encounterSets`). Sin villano y sin módulos → nada. NO cambiar ningún `speech` (audios de pago con huella en scripts/voice/manifest.json; gate voice-drift). No tocar `text`.
- D-08 Fuera de alcance: modo heroico, campaña, otros packs, clips de voz.
</locked_decisions>

<discretion_choices>
Elecciones del planificador (documentadas aquí para que el ejecutor no las reabra):
- Nombres españoles de módulos, del set de cada villano («Rino», «Klaw», «Ultrón», «Kang») y de los sets base («Normal», «Experto») los descarga el script de `https://es.marvelcdb.com/api/public/cards/<pack>.json?encounter=1` (campo `card_set_name` por `card_set_code`). Los nombres ingleses de los módulos (para la comprobación del recomendado) salen del mismo endpoint en `https://marvelcdb.com/api/public`. Verificado hoy: core ES da rhino→Rino, klaw→Klaw, ultron→Ultrón, bomb_scare→Amenaza de bomba, masters_of_evil→Señores del Mal, under_attack→Civiles en peligro, legions_of_hydra→Legiones de Hydra, the_doomsday_chair→La silla del Juicio Final, standard→Normal (tipo standard), expert→Experto (tipo expert); toafk ES da kang→Kang, temporal→Temporal, mot→Amo del tiempo, anachronauts→Anacronautas, exp_kang→Kang Experto; toafk EN da temporal→Temporal, mot→Master of Time, anachronauts→Anachronauts. El campo de tipo es `card_set_type_name_code` (villain/modular/standard/expert/hero/nemesis). Todo se resuelve en memoria antes de escribir (garantía abort-before-write intacta).
- La línea del paso usa el nombre español del set del villano (`encounterSetName`, «Rino»), no el `name` inglés del catálogo («Rhino»), porque es lo que pone en las cartas españolas de la caja. El selector de villano sigue mostrando `name` (convención D-07 anterior, sin cambios).
- Ids de módulo = `card_set_code` con `_` → `-` (bomb-scare, masters-of-evil, under-attack, legions-of-hydra, the-doomsday-chair, temporal, mot, anachronauts), para cumplir el patrón kebab-case de ids del catálogo.
- `moduleIds` vive dentro de `HeroSelection` (junto a `villainId`, que es donde vive el villano), campo opcional aditivo: `undefined` = «sin personalizar → recomendado del villano». `[]` explícito = «el grupo desmarcó todo» y se respeta.
- `contentVersion` se queda en 14: añadir `value` a un paso no cambia ningún runtimeId (precedente: quick 260902-0oz, «contentVersion intacto, ids sin cambios»; y el quick m2k cambió texto sin subirlo). engine/persistence.ts no se toca: `context` ya viaja entero.
- La línea de conjuntos NO incluye «Kang Experto» (exp_kang): la sustitución de cartas de villano en Experto ya la cubre el paso setup.escenario.04; añadirla aquí sería dato no pedido.
- El modal multiselección no se cierra al marcar; se cierra con ✕, velo, Escape o un botón «Hecho» al pie.
</discretion_choices>

<interfaces>
Contratos existentes que el ejecutor usa (extraídos del código; no hace falta explorar):

engine/types.ts (actual):
  export type StepValueKind = 'villainHealth' | 'heroHealth' | 'handSizeAlterEgo'
  export interface HeroSelection { villainId: string | null; heroes: { heroId: string | null, playerName: string }[] }
  export interface SessionContext { playerCount: number; difficulty: Difficulty; selection?: HeroSelection; counters?: CounterState; startedAt?: number; endedAt?: FrozenEndInstant; [key: string]: unknown }
  export interface CatalogueVillain { id: string; name: string; stages: VillainStage[]; expertStartStage?: number }
  export interface CharacterCatalogue { gameId: string; heroes: CatalogueHero[]; villains: CatalogueVillain[] }

engine/schema.ts línea ~84: value: z.enum(['villainHealth', 'heroHealth', 'handSizeAlterEgo']).optional()

engine/selection.ts: emptySelection(playerCount), resolvePlayerSlots(context), resolveVillainId(context), setVillain(session, villainId) — hoy construye `selection: { villainId, heroes }` desde cero —, setHero/setPlayerName (hacen `{ ...current, heroes }`, así que conservan campos extra de selection).

engine/stepValues.ts: resolveStepValue(kind, context, catalogue): number | null (solo 'villainHealth', igualdad estricta); resolveStepValueRows(kind, context, catalogue): StepValueRow[] (solo heroHealth/handSizeAlterEgo). Un kind nuevo cae en null/[] en las dos sin tocarlas.

engine/counters.ts: computeInitialVillainHealth(villain, playerCount, difficulty) — ya usa expertStartStage.

app/composables/useGameSession.ts: única costura motor↔Vue; mutadores = guarda `if (!session.value) return` + UNA reasignación de session.value (nunca mutación anidada: el watchDebounced de la página no es profundo). Expone showsSelectionGrid, playerSlots, selectedVillainId, setVillain, stepValueSuffix, stepValueRows. Obtiene catálogo con getCatalogue(session.value.gameId). Funciones puras exportadas y testeadas en app/composables/__tests__/useGameSession.test.ts (p. ej. buildStepValueSuffix).

app/pages/[game]/index.vue: activeSelectionModal = ref<{ kind: 'villain' } | { kind: 'player', slot: number } | null>; onSelectRow(key) captura document.activeElement en selectionTriggerEl y abre modal; onDismissSelectionModal cierra y devuelve el foco; selectionRows computed (fila villain key 'villain' label 'Villano', luego filas player-N); StepScreen recibe :step-value-suffix / :step-value-rows; VillainPickerModal montado con v-if tras WarningDetailModal.

app/components/VillainPickerModal.vue: role="dialog" aria-modal aria-labelledby, velo `fixed inset-0 z-50 bg-background/80` con @click.self dismiss, panel `w-full max-w-[640px] max-h-[80dvh] bg-surface flex flex-col`, cabecera h-16 con h1 `text-heading font-bold` y botón ✕ (ref dismissButton, foco al montar, aria-label), Escape por listener window keydown, filas `min-h-12 px-md py-sm text-body` con ✓ `text-accent` y aria-label que enuncia el estado.

app/components/StepScreen.vue: `<p class="text-display font-bold text-primary-text">{{ actionText }}{{ stepValueSuffix ?? '' }}</p>` y bloques opcionales con v-if; props con withDefaults a null.

Tokens tipográficos: text-display 2.5rem, text-heading 1.75rem, text-body 1.25rem, text-label 1.125rem. Colores usados: text-primary-text, text-secondary-text, text-accent, text-warning, bg-surface, bg-background, border-accent/50.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Catálogo — Klaw, sets base, módulos y recomendado por villano (script + esquema + tipos + JSON regenerado)</name>
  <files>scripts/catalogue/fetch-marvelcdb.mjs, engine/types.ts, engine/catalogueSchema.ts, content/marvel-characters.json, engine/__tests__/catalogueSchema.test.ts, engine/__tests__/characters.test.ts, engine/__tests__/counters.test.ts</files>
  <behavior>
    - catalogueSchema: acepta catálogo con baseSets {standard, expert} y modules [{id,name,difficulty?}]; rechaza difficulty 0, negativa o no entera; rechaza clave desconocida dentro de un módulo (strictObject, p. ej. "text"); rechaza ids de módulo duplicados; rechaza un villano cuyo recommendedModuleId no está en modules; rechaza villano sin encounterSetName o sin recommendedModuleId.
    - characters (JSON real): Klaw existe con stages 12/18/22 per-hero y expertStartStage 2; recommendedModuleId de rhino/klaw/ultron/kang = bomb-scare/masters-of-evil/under-attack/temporal; encounterSetName de rhino = «Rino»; baseSets = {standard: «Normal», expert: «Experto»}; ningún módulo tiene id exp-kang; difficulty de temporal/mot/anachronauts = 4/6/8 y los cinco módulos de core no llevan la clave difficulty. Sin aserciones de longitud fija de arrays (regla CAT-07 del fichero).
    - counters: Klaw Normal 2 jugadores = 24; Klaw Experto 2 jugadores = 36 (computeInitialVillainHealth con el villano real del catálogo).
  </behavior>
  <action>
Implementa D-01, D-02 y D-03 respetando las reglas del script (D-05 abortar sin escribir, D-09 único escritor, D-10 salida determinista, CAT-04 lista blanca campo a campo, nunca copiar texto de carta).

1) engine/types.ts: nueva interfaz `CatalogueModule { id: string; name: string; difficulty?: number }` y `CatalogueBaseSets { standard: string; expert: string }`. `CatalogueVillain` gana `encounterSetName: string` y `recommendedModuleId: string` (obligatorios). `CharacterCatalogue` gana `baseSets: CatalogueBaseSets` y `modules: CatalogueModule[]`. Comentarios en español explicando que el nombre del set es el español de es.marvelcdb.com y que el recomendado es dato a mano comprobado contra la cara 1A.

2) engine/catalogueSchema.ts: `ModuleSchema = z.strictObject({ id: regex characterIdPattern, name: min(1), difficulty: int positive optional })`; `BaseSetsSchema = z.strictObject({ standard: min(1), expert: min(1) })`; VillainSchema añade `encounterSetName: z.string().min(1)` y `recommendedModuleId: z.string().regex(characterIdPattern)`; raíz añade `baseSets` y `modules: z.array(ModuleSchema)`. En el superRefine: ids de módulo únicos, y cada villano.recommendedModuleId debe existir en modules (mensaje en inglés como los existentes). Todo strictObject (CR-01).

3) scripts/catalogue/fetch-marvelcdb.mjs:
   - VILLAIN_STAGE_CARDS: tres filas Klaw (01113/01114/01115, stage 1/2/3, expectedSetCode 'klaw') justo después de las de Rhino. Actualiza el comentario de cabecera de esa constante: Klaw ya no está excluido (el comentario D-02 antiguo decía lo contrario) y el recuento de filas.
   - VILLAIN_SCENARIOS: añade a cada fila `recommendedModuleCode` (card_set_code de MarvelCDB: 'bomb_scare', 'temporal', 'under_attack') y la fila Klaw `{ villainName: 'Klaw', mainSchemeCode: '01116a', expectedMainSchemeName: 'Underground Distribution', expectedSetCode: 'klaw', expertStartStage: 2, recommendedModuleCode: 'masters_of_evil' }` en el mismo orden que VILLAIN_STAGE_CARDS. Quita la línea «Klaw sigue fuera del catálogo».
   - Constantes nuevas: `API_BASE_ES = 'https://es.marvelcdb.com/api/public'`; `ENCOUNTER_PACKS = ['core', 'toafk']`; `ENCOUNTER_MODULES` (dato a mano, en este orden): bomb_scare/core, masters_of_evil/core, under_attack/core, legions_of_hydra/core, the_doomsday_chair/core, temporal/toafk difficulty 4, mot/toafk difficulty 6, anachronauts/toafk difficulty 8 — con comentario: dificultades dadas por el usuario desde el reglamento de Kang, las de core desconocidas y por eso sin clave (nunca inventar); `EXCLUDED_MODULAR_CODES = ['exp_kang']` con comentario de por qué (set de villano Experto de Kang, MarvelCDB lo marca modular).
   - Función `fetchPackEncounterSets(apiBase, pack)`: GET `${apiBase}/cards/${pack}.json?encounter=1`, mismas reglas de error (!ok → throw con status) y la misma pausa REQUEST_DELAY_MS que fetchCard; devuelve un Map card_set_code → { name: card_set_name, type: card_set_type_name_code, pack: pack_code }. Solo lee esas tres claves de cada carta (CAT-04); ignora cartas sin card_set_code.
   - Guardas previas a la red en main(): códigos de ENCOUNTER_MODULES únicos; difficulty, si existe, entero > 0; cada recommendedModuleCode está en ENCOUNTER_MODULES; ningún código de ENCOUNTER_MODULES está en EXCLUDED_MODULAR_CODES.
   - Tras descargar los packs en EN y ES (4 peticiones): cada módulo existe en ambos mapas con type 'modular' y pack igual al declarado; todo card_set_code de tipo 'modular' presente en esos packs está en ENCOUNTER_MODULES o en EXCLUDED_MODULAR_CODES (si aparece uno nuevo, abortar: la lista a mano quedó incompleta); el set de cada villano (expectedSetCode de VILLAIN_SCENARIOS) existe en ES con type 'villain' → encounterSetName; ES 'standard' (type 'standard') y 'expert' (type 'expert') existen y valen exactamente «Normal» y «Experto» (copia que el usuario fijó; si MarvelCDB cambia, abortar).
   - Renombra checkExpertStartStage a `checkMainScheme(row, englishSets)` descargando la carta una sola vez: mantiene todas las puertas actuales (type_code, name, card_set_code, línea de Experto) y añade la del recomendado: sobre el texto sin etiquetas HTML, regex `/One modular encounter set \((?:recommended:\s*)?([^)]+?)\.?\s*\)/`; el capturado, recortado y sin punto final, debe ser igual a `englishSets.get(row.recommendedModuleCode).name`; si no hay coincidencia o difiere, throw con mensaje en español que cite código de carta, dato a mano y fragmento. Actualiza la referencia en el comentario T-m2k-01.
   - Salida: villano = `{ id, name, stages, expertStartStage, encounterSetName, recommendedModuleId }` (recommendedModuleId = recommendedModuleCode con `_`→`-`), en ese orden de claves. Catálogo = `{ gameId, heroes, villains, baseSets: { standard, expert }, modules }`; módulo = `{ id, name }` más `difficulty` solo si está declarada (asignación condicional, nunca undefined). Actualiza comentarios de conteo de peticiones y del procedimiento de una fila (paso 1b: añadir también `recommendedModuleCode`; nuevo paso: al comprar una caja, añadir su pack a ENCOUNTER_PACKS y sus módulos a ENCOUNTER_MODULES). No toques el texto que el test CAT-07 de catalogue-isolation busca: ejecuta ese test tras editar.
   - Ejecuta `npm run catalogue:generate` (red real, ~100 s por el pacing). Revisa `git diff -- content/marvel-characters.json`: solo debe añadir Klaw, encounterSetName/recommendedModuleId en los villanos, baseSets y modules; ninguna cifra existente cambia. Prueba deliberada de fallo (no committear): cambia temporalmente el recommendedModuleCode de Rhino a 'masters_of_evil', ejecuta el script, confirma que aborta con mensaje claro y que `git diff` del JSON no cambia, y revierte.

4) Tests: actualiza baseCatalogue() de catalogueSchema.test.ts con baseSets, modules (al menos bomb-scare) y los dos campos nuevos del villano; añade el describe de módulos según <behavior>. Añade en characters.test.ts los casos del JSON real y amplía el test D-11 si lista claves permitidas del villano (no lo hace hoy: solo etapas). En counters.test.ts añade los dos casos de Klaw y completa el literal tipado `brokenCatalogue` (línea ~447) con baseSets, modules y los campos de villano para que typecheck pase.
  </action>
  <verify>
    <automated>cd /Users/vcompanyb/TableGameAssistant && npx vitest run engine/__tests__/catalogueSchema.test.ts engine/__tests__/characters.test.ts engine/__tests__/counters.test.ts engine/__tests__/catalogue-isolation.test.ts && grep -c '"recommendedModuleId"' content/marvel-characters.json && ! grep -q 'exp-kang' content/marvel-characters.json</automated>
  </verify>
  <done>JSON regenerado por el script con 4 villanos (Klaw incluido), baseSets, 8 módulos y recomendados; la prueba de fallo del recomendado abortó sin escribir; los cuatro ficheros de test pasan. Commit: `feat(catalogo): Klaw, módulos de encuentro de core y Kang, y módulo recomendado por villano comprobado contra la carta 1A`.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Motor — moduleIds en la selección, resolución por defecto defensiva y valor de paso encounterSets</name>
  <files>engine/types.ts, engine/schema.ts, engine/encounterSets.ts, engine/selection.ts, engine/stepValues.ts, content/marvel-champions.json, engine/__tests__/encounterSets.test.ts, engine/__tests__/selection.test.ts, engine/__tests__/stepValues.test.ts, engine/__tests__/persistence.test.ts, engine/__tests__/content.test.ts</files>
  <behavior>
    - resolveModuleIds: selección sin moduleIds + villano rhino → ['bomb-scare']; sin villano → []; moduleIds [] explícito → []; moduleIds ['legions-of-hydra','nope',42,'legions-of-hydra','bomb-scare'] con rhino → ['bomb-scare','legions-of-hydra'] (desconocidos y no-string fuera, sin duplicados, orden de orderModulesForVillain); moduleIds 'bomb-scare' (no array) → valor por defecto; selection ausente o null → []; catálogo null → [].
    - orderModulesForVillain(catalogue, 'klaw'): primer elemento masters-of-evil con recommended true, resto en orden de catálogo con recommended false; villano null/desconocido → orden de catálogo, ninguno recommended.
    - setVillain: de rhino a klaw con moduleIds personalizados → moduleIds desaparece (resolveModuleIds da ['masters-of-evil']); de rhino a rhino → moduleIds se conserva; el argumento nunca se muta y session/context/selection son objetos nuevos.
    - setModules(session, ids): guarda una copia nueva, filtra no-strings y duplicados, conserva villainId y heroes; sin selection previa parte de emptySelection. toggleModule(session, 'legions-of-hydra', catalogue) sobre rhino por defecto → ['bomb-scare','legions-of-hydra']; toggle 'bomb-scare' otra vez → ['legions-of-hydra']; toggle de id desconocido → misma referencia de sesión.
    - resolveEncounterSetNames: rhino Experto sin personalizar → ['Rino','Normal','Experto','Amenaza de bomba']; kang Normal → ['Kang','Normal','Temporal']; sin villano ni módulos → []; sin villano con legions-of-hydra en Experto → ['Normal','Experto','Legiones de Hydra'].
    - resolveStepValueText('encounterSets', ...) → 'Rino · Normal · Experto · Amenaza de bomba'; con [] de nombres → null; cualquier otro kind → null. resolveStepValue y resolveStepValueRows con 'encounterSets' → null y [].
    - persistence: resume() de una posición guardada sin moduleIds (villano ultron) → outcome 'resumed' y resolveModuleIds da ['under-attack']; con moduleIds ['legions-of-hydra'] → se conserva tras resume.
    - content: setup.encuentros.01 declara value 'encounterSets'; su text y speech siguen siendo exactamente los actuales; contentVersion sigue en 14.
  </behavior>
  <action>
Implementa D-05, D-06 y D-07 en el motor puro (cero imports de Vue/Nuxt/DOM).

1) engine/types.ts: `StepValueKind` añade 'encounterSets' (actualiza el comentario de StepDefinition.value: ya no son tres valores; el nuevo produce una línea de texto). `HeroSelection` añade `moduleIds?: string[]` con comentario: campo aditivo (no bumpea formatVersion ni contentVersion); `undefined` = sin personalizar → recomendado del villano; `[]` = el grupo desmarcó todo.

2) engine/schema.ts: añade 'encounterSets' al z.enum de `value` y actualiza su comentario.

3) engine/encounterSets.ts (nuevo, cabecera explicativa en español como los hermanos): exporta
   - `ModuleOption { id: string; name: string; difficulty?: number; recommended: boolean }` (difficulty solo presente si el catálogo la trae).
   - `orderModulesForVillain(catalogue: CharacterCatalogue | null, villainId: string | null): ModuleOption[]` — recomendado del villano primero (si existe en modules), resto en orden de catálogo; catálogo null → [].
   - `resolveModuleIds(context: SessionContext, catalogue: CharacterCatalogue | null): string[]` — validación por TIPO (el localStorage es editable): si `context.selection?.moduleIds` es array → conserva solo strings que existen en catalogue.modules, sin duplicados, ordenados según orderModulesForVillain; si no es array (ausente, corrupto) → [recommendedModuleId del villano resuelto con resolveVillainId, si ese villano y ese módulo existen] o []. Nunca lanza.
   - `setModules(session: EngineSession, moduleIds: string[]): EngineSession` — objeto nuevo en session/context/selection y array nuevo; filtra no-strings y duplicados; conserva villainId y heroes (heroes vía resolvePlayerSlots, como setVillain). No valida contra el catálogo (el resolver lo hace al leer, igual que setHero).
   - `toggleModule(session, moduleId: string, catalogue): EngineSession` — si moduleId no está en catalogue.modules devuelve la misma referencia; si no, parte de resolveModuleIds (así el primer toque convierte el valor por defecto en explícito) y añade o quita, delegando en setModules.
   - `resolveEncounterSetNames(context, catalogue): string[]` — [encounterSetName del villano si hay villano en catálogo, baseSets.standard, baseSets.expert solo si difficulty === 'expert', ...nombres de resolveModuleIds]; si no hay villano Y no hay módulos → []. Catálogo null → [].

4) engine/selection.ts: setVillain aplica la regla D-05 — si `villainId` es distinto de `resolveVillainId(session.context)`, selection = `{ villainId, heroes }` (sin moduleIds → vuelve al recomendado del nuevo villano); si es el mismo, conserva `moduleIds` de la selección actual (sigue devolviendo objetos nuevos). Documenta la regla en el comentario de la función. No importes encounterSets desde selection (evita ciclo; encounterSets importa de selection).

5) engine/stepValues.ts: nueva `resolveStepValueText(kind, context, catalogue): string | null` — igualdad estricta con 'encounterSets' (mismo razonamiento que resolveStepValue: kind llega como JSON crudo); nombres = resolveEncounterSetNames; vacío → null; si no, `names.join(' · ')`. No toques resolveStepValue ni resolveStepValueRows (ya devuelven null/[] para el kind nuevo); actualiza el comentario de cabecera.

6) content/marvel-champions.json: en setup.encuentros.01 añade `"value": "encounterSets"` tras `"kind": "step"`. NO cambies text, speech, ids ni contentVersion (queda en 14 — ver discretion_choices).

7) Tests según <behavior>: nuevo engine/__tests__/encounterSets.test.ts (usa el catálogo real leído con readFileSync como stepValues.test.ts, y una sesión construida como en selection.test.ts); añade casos en selection.test.ts, stepValues.test.ts, persistence.test.ts y content.test.ts (value de setup.encuentros.01; text y speech literales actuales: «Reunid los conjuntos de encuentro indicados en el Plan Principal, cara 1A.» / «Reunid los conjuntos de encuentro que indique el Plan Principal, cara 1A.»). Escribe los tests primero y comprueba que fallan (RED) antes de implementar.
  </action>
  <verify>
    <automated>cd /Users/vcompanyb/TableGameAssistant && npx vitest run engine/ && git diff --quiet -- scripts/voice/manifest.json</automated>
  </verify>
  <done>Toda la suite de engine/ pasa (incluidos voice-drift y content), manifest de voz sin cambios, ningún speech tocado. Commit: `feat(motor): selección de módulos en la sesión y línea de conjuntos de encuentro en setup.encuentros.01`.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Interfaz — fila «Módulos», ModulePickerModal y línea de conjuntos en StepScreen</name>
  <files>app/composables/useGameSession.ts, app/components/ModulePickerModal.vue, app/components/StepScreen.vue, app/pages/[game]/index.vue, app/composables/__tests__/useGameSession.test.ts</files>
  <behavior>
    - buildModulesValueLabel([]) → '—'; (['Amenaza de bomba']) → 'Amenaza de bomba'; (['Amenaza de bomba','Legiones de Hydra']) → 'Amenaza de bomba, Legiones de Hydra'.
    - buildBaseSetLabels(baseSets, 'normal') → ['Normal']; (baseSets, 'expert') → ['Normal','Experto']; baseSets null → [].
  </behavior>
  <action>
Implementa D-04 y la parte visible de D-07. Copia en español; tamaños legibles en tablet con los tokens existentes.

1) app/composables/useGameSession.ts: importa de '~~/engine/encounterSets' (orderModulesForVillain, resolveModuleIds, resolveEncounterSetNames no hace falta si usas resolveStepValueText, toggleModule as engineToggleModule, tipo ModuleOption) y resolveStepValueText de stepValues. Exporta funciones puras `buildModulesValueLabel(names: string[]): string` (join ', ' o '—') y `buildBaseSetLabels(baseSets: CatalogueBaseSets | null, difficulty): string[]`. Añade y devuelve: `moduleOptions` computed (orderModulesForVillain con el villano actual), `selectedModuleIds` computed (resolveModuleIds), `baseSetLabels` computed, `toggleModule(moduleId)` (guarda + UNA reasignación de session.value con engineToggleModule y el catálogo, nunca mutación anidada), y `stepValueLine` computed (resolveStepValueText con currentNode.value?.step.value; null sin sesión).

2) app/components/ModulePickerModal.vue (nuevo, componente tonto calcado de VillainPickerModal.vue: mismo velo, panel, cabecera h-16, ✕ con foco al montar, Escape, @click.self). Props: `baseSets: string[]`, `modules: { id: string, name: string, difficulty?: number, recommended: boolean }[]`, `selectedIds: string[]`. Emits: `toggle: [moduleId: string]`, `dismiss: []`. aria-labelledby "module-picker-heading", h1 «MÓDULOS» (mismo estilo en mayúsculas que «VILLANO»), aria-label del ✕ «Cerrar selector de módulos». Cuerpo con scroll:
   - Rótulo de sección `text-label font-bold uppercase text-secondary-text` «Sets base» y una fila `<div>` no pulsable por nombre (sin chevron, sin @click, sin active:, regla D-32 de afordancia) con el nombre en text-body.
   - Rótulo «Módulos adicionales» y un `<button type="button" role="checkbox" :aria-checked>` por módulo, `min-h-12 px-md py-sm text-body`, con casilla visible a la izquierda (cuadro con borde border-accent y ✓ text-accent cuando está marcado), el nombre, la etiqueta «Recomendado» (`text-label font-bold uppercase text-accent`) si recommended, y «Dificultad N» (`text-label text-secondary-text`) solo si difficulty es número. aria-label compuesto: nombre + «, recomendado» si aplica + «, dificultad N» si aplica. Tocar emite toggle y NO cierra.
   - Pie shrink-0 con botón «Hecho» (min-h-12, ancho completo, border-t) que emite dismiss.
   - Si `modules` está vacío, un `<p>` «No hay módulos en el catálogo.» en text-secondary-text.

3) app/components/StepScreen.vue: prop opcional `stepValueLine?: string | null` (default null, comentario D-07: línea no pulsable). Renderízala justo después del `<p>` de actionText como `<p v-if="stepValueLine" class="text-heading font-bold text-primary-text">{{ stepValueLine }}</p>` — interpolación, nunca HTML crudo (T-01-01).

4) app/pages/[game]/index.vue: amplía el tipo de activeSelectionModal con `{ kind: 'modules' }`; en onSelectRow, key 'modules' abre ese modal (antes del regex de player). En selectionRows, tras la fila del villano, añade `{ key: 'modules', label: 'Módulos', valueLabel: buildModulesValueLabel(nombres de moduleOptions filtrados por selectedModuleIds en su orden), hasValue: selectedModuleIds.length > 0, ariaLabel: 'Elegir módulos' }`. Monta `<ModulePickerModal v-if="activeSelectionModal?.kind === 'modules'" :base-sets="baseSetLabels" :modules="moduleOptions" :selected-ids="selectedModuleIds" @toggle="toggleModule" @dismiss="onDismissSelectionModal" />` junto a VillainPickerModal. Pasa `:step-value-line="stepValueLine"` a StepScreen. Desestructura los nuevos miembros de useGameSession e importa buildModulesValueLabel.

5) Tests en app/composables/__tests__/useGameSession.test.ts según <behavior>. Después ejecuta typecheck y la suite completa.
  </action>
  <verify>
    <automated>cd /Users/vcompanyb/TableGameAssistant && npx vitest run && npm run typecheck</automated>
    <human-check>npm run dev, abrir Marvel Champions, 2 jugadores, Experto: en «Elegir villano y héroes» elegir Rhino → fila «Módulos: Amenaza de bomba»; abrir el modal → «Normal», «Experto», Amenaza de bomba primero con «Recomendado», Temporal «Dificultad 4»; marcar Legiones de Hydra, cerrar, cambiar a Klaw → «Señores del Mal»; recargar → se conserva; avanzar a «Reunir conjuntos de encuentro» → «Klaw · Normal · Experto · Señores del Mal».</human-check>
  </verify>
  <done>Suite completa en verde y typecheck limpio; la fila, el modal y la línea del paso se comportan como describe la human-check. Commit: `feat(seleccion): fila y selector de módulos de encuentro con el recomendado del villano`.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| localStorage → motor | `context.selection.moduleIds` es editable a mano (DevTools) o viene de una versión anterior |
| API MarvelCDB → repo | el script descarga cartas con texto/arte con copyright; solo debe entrar la lista blanca de campos |
| contenido JSON → pantalla | nombres de módulo/villano se pintan en la UI |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-mpj-01 | Tampering | resolveModuleIds (engine/encounterSets.ts) | mitigate | validación por tipo: no-array → valor por defecto; solo strings existentes en catalogue.modules; deduplicado; nunca lanza (tests con datos corruptos) |
| T-mpj-02 | Information disclosure (copyright) | fetchPackEncounterSets / checkMainScheme | mitigate | lista blanca: solo card_set_code/card_set_name/card_set_type_name_code/pack_code; el text de la 1A se usa solo en memoria para comparar; esquema strictObject en ModuleSchema/BaseSetsSchema; guardarraíl FORBIDDEN_KEYS de characters.test.ts sigue activo |
| T-mpj-03 | Tampering (dato de reglas) | ENCOUNTER_MODULES / VILLAIN_SCENARIOS | mitigate | recomendado comprobado contra la cara 1A y lista de modulares comprobada contra los packs; cualquier discrepancia aborta sin escribir (D-05) |
| T-mpj-04 | Tampering (XSS) | StepScreen / ModulePickerModal | mitigate | solo interpolación de texto, sin HTML crudo (T-01-01) |
| T-mpj-05 | Repudiation/cost | scripts/voice/manifest.json | mitigate | ningún speech cambia; gate voice-drift y `git diff --quiet` del manifest en la verificación |
</threat_model>

<verification>
- `npx vitest run` en verde (incluye voice-drift, content, characters, catalogue-isolation).
- `npm run typecheck` limpio.
- `git diff -- scripts/voice/manifest.json` vacío; ningún `"speech"` modificado en content/marvel-champions.json (`git diff content/marvel-champions.json` solo añade la línea `"value": "encounterSets"`).
- content/marvel-characters.json escrito solo por el script (D-09), contentVersion sigue en 14.
</verification>

<success_criteria>
- Klaw elegible con vida inicial correcta (24 Normal / 36 Experto a 2 jugadores).
- Fila «Módulos» + modal con sets base, recomendado primero con etiqueta y dificultad solo cuando se conoce.
- Selección por defecto = recomendado, reinicio al cambiar de villano, persistida y tolerante a sesiones antiguas o manipuladas.
- setup.encuentros.01 nombra los conjuntos a reunir sin tocar la locución.
</success_criteria>

<output>
Create `.planning/quick/260925-mpj-selector-de-modulos/260925-mpj-SUMMARY.md` when done
</output>
