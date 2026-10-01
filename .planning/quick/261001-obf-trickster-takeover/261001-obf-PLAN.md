---
phase: quick-261001-obf
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/catalogue/fetch-marvelcdb.mjs
  - content/marvel-characters.json
  - engine/__tests__/characters.test.ts
  - engine/__tests__/counters.test.ts
  - engine/__tests__/encounterSets.test.ts
autonomous: true
requirements: [QUICK-261001-obf]

must_haves:
  truths:
    - "El selector de villano muestra «Enchantress» y «Loki» junto a Rhino/Klaw/Kang/Ultron/Brigada de Demolición"
    - "Enchantress precarga 15×jugadores en Normal y 16×jugadores en Experto (arranca en la etapa II); sus etapas son 15/16/18, todas por héroe, sin cifras Expertas propias"
    - "Loki precarga 20×jugadores en Normal y en Experto (una sola etapa, sin mecánica de escenario: ni formas Avatar de Loki, ni volteo, ni Intense Focus)"
    - "El selector de módulos ofrece «Magia embaucadora» (sin dificultad) y la marca como Recomendado, primero en la lista, cuando el villano es Enchantress o Loki"
    - "La línea de conjuntos a reunir muestra «Encantadora» o «Dios de las mentiras» como set del villano"
    - "Los cinco villanos y ocho módulos que ya existían siguen exactamente igual en el catálogo"
  artifacts:
    - path: "scripts/catalogue/fetch-marvelcdb.mjs"
      provides: "Filas de Enchantress y Loki en VILLAIN_STAGE_CARDS y VILLAIN_SCENARIOS, `tt` en ENCOUNTER_PACKS, `trickster_magic` en ENCOUNTER_MODULES, regex del módulo recomendado que admite «One modular set», STAGE_MAP con la etapa arábiga «1»"
      contains: "trickster_magic"
    - path: "content/marvel-characters.json"
      provides: "Villanos enchantress y loki y módulo trickster-magic, emitidos por el script"
      contains: "trickster-magic"
  key_links:
    - from: "scripts/catalogue/fetch-marvelcdb.mjs VILLAIN_SCENARIOS"
      to: "carta 55004a / 55028a vía checkMainScheme"
      via: "expertStartStage y recommendedModuleCode comprobados contra el texto de la carta en memoria"
      pattern: "55004a|55028a"
    - from: "content/marvel-characters.json villains[].recommendedModuleId"
      to: "content/marvel-characters.json modules[].id"
      via: "superRefine de engine/catalogueSchema.ts (recomendado debe existir en modules)"
      pattern: "trickster-magic"
---

<objective>
Añadir el pack de escenario Trickster Takeover (MarvelCDB `tt`): Enchantress y Loki se pueden elegir como villanos, y «Magia embaucadora» aparece en el selector de módulos.

Por qué: el grupo tiene la caja y quiere jugarla con el asistente; el histórico y las estadísticas deben registrar cada villano con su propio id.

Salida: tres entradas nuevas en `content/marvel-characters.json` (villanos `enchantress` y `loki`, módulo `trickster-magic`), emitidas SOLO por `npm run catalogue:generate` (D-09). No hay cambios de esquema, motor ni UI: el esquema ya admite villanos de una sola etapa, sin `expert` y con `recommendedModuleId`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md
@.planning/quick/261001-o3p-brigada-de-demolicion/261001-o3p-SUMMARY.md
@scripts/catalogue/fetch-marvelcdb.mjs
@engine/__tests__/characters.test.ts
@engine/__tests__/counters.test.ts
@engine/__tests__/encounterSets.test.ts

<api_facts>
Comprobado contra https://marvelcdb.com/api/public el 2026-10-01, durante la planificación. Son los valores reales que el script debe declarar a mano y comprobar contra la API. NO copiar texto de carta al repo (CAT-04): estas notas solo justifican los datos a mano.

Pack `tt`, encounter=1 (66 cartas). Tres card_set_code:
- `enchantress_villain`: EN «Enchantress», ES «Encantadora», type villain
- `god_of_lies`: EN «God of Lies», ES «Dios de las mentiras», type villain
- `trickster_magic`: EN «Trickster Magic», ES «Magia embaucadora», type modular (es el ÚNICO modular del pack)
No hay set de villano Experto (ningún `exp_enchantress` ni parecido).

Etapas de villano:
- 55001 Enchantress, set enchantress_villain, stage "I", health 15, per_hero true, per_group false
- 55002 Enchantress, stage "II", 16, true, false
- 55003 Enchantress, stage "III", 18, true, false
- 55027a «Loki, God of Lies», set god_of_lies, stage "1" (cifra ARÁBIGA, no romana), health 20, per_hero true, per_group false
- 55029a–55032a: las cuatro formas «Avatar of Loki» (stages A1/B1/C1/D1, 15 cada una). NO se declaran (mecánica de escenario fuera de alcance, decisión del usuario).

Planes principales:
- 55004a «Prime Real Estate», main_scheme, set enchantress_villain, stage 1A. Su línea Contents trae «(Enchantress (II) and Enchantress (III) instead for expert mode.)», así que expertStartStage = 2. La regex actual expertModeRegex ya la reconoce (probado). Y trae «One modular set (Trickster Magic).»: dice «modular set», SIN la palabra «encounter», así que la regex actual recommendedRegex NO lo reconoce (probado: null). Hay que ampliarla.
- 55028a «Worlds Collide», main_scheme, set god_of_lies, stage "A". Es la carta de Contents del escenario de Loki: «Contents: Loki, God of Lies (1). [...] One modular encounter set (Trickster Magic).» No trae ninguna línea «instead for expert mode», así que expertStartStage = 1.
- 55033a «Mischief and Mayhem», main_scheme, set god_of_lies, stage 1A. NO trae Contents ni módulo. Su única mención a Experto es colocar el apego Intense Focus en el Avatar de Loki: es mecánica de escenario y no cambia de etapa. No se usa en el script.
</api_facts>

<interfaces>
Shapes de fila actuales en scripts/catalogue/fetch-marvelcdb.mjs (copiar el estilo):
- VILLAIN_STAGE_CARDS: { villainName, code, stage, expectedSetCode } (más expertCode/expectedExpertSetCode solo si hay set Experto; aquí NO)
- VILLAIN_SCENARIOS: { villainName, mainSchemeCode, expectedMainSchemeName, expectedSetCode, expertStartStage, recommendedModuleCode }
- ENCOUNTER_MODULES: { code, pack, difficulty? }
- STAGE_MAP = { I: 1, II: 2, III: 3 }: lo usan extractStageFields (card.stage) y checkMainScheme (romano capturado por expertModeRegex, que solo captura I{1,3})
- recommendedRegex (dentro de checkMainScheme): /One modular encounter set \((?:recommended:\s*)?([^)]+?)\.?\s*\)/
- Salida del villano real: { id: slugify(villainName), name: villainName, stages, expertStartStage, encounterSetName (card_set_name ES), recommendedModuleId (code con _ → -) }
- Los placeholders (Brigada) se emiten DESPUÉS de los villanos reales.

Convención de `name` (decisión del usuario: seguir la de los villanos existentes): los villanos reales usan el nombre INGLÉS de la carta (Rhino aunque el set ES sea «Rino», Ultron aunque sea «Ultrón»); solo el placeholder Brigada usa el rótulo español del set. Además checkMainScheme exige que el nombre de la línea de Experto coincida con villainName («Enchantress»). Por eso: villainName «Enchantress» (id `enchantress`) y «Loki» (id `loki`; el nombre de carta completo «Loki, God of Lies» no se usa, igual que Kang no usa el nombre de su carta de etapa II). El nombre español sale en la línea de conjuntos vía encounterSetName.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Generador con Trickster Takeover y catálogo regenerado</name>
  <files>scripts/catalogue/fetch-marvelcdb.mjs, content/marvel-characters.json</files>
  <action>
Editar scripts/catalogue/fetch-marvelcdb.mjs (copiar el estilo de comentarios de las filas existentes, en español):

1. STAGE_MAP: añadir la clave '1' con valor 1. Comentario: Loki, God of Lies (55027a) imprime su única etapa en cifra arábiga «1», no «I». expertModeRegex solo captura romanos, así que esto no afecta a esa comprobación. La puerta mappedStage === stage de extractStageFields sigue en pie.

2. ENCOUNTER_PACKS: pasar a ['core', 'toafk', 'twc', 'tt']. Comentario: `tt` es «Trickster Takeover», comprado el 2026-10-01. Trae dos sets de villano (enchantress_villain, god_of_lies) y un solo modular (trickster_magic), comprobado contra la API ese día.

3. ENCOUNTER_MODULES: añadir al final { code: 'trickster_magic', pack: 'tt' }, SIN difficulty. Comentario: no hay fuente fiable de su dificultad y nunca se inventa un número (mismo criterio que los cinco del Core Set). EXCLUDED_MODULAR_CODES no cambia.

4. VILLAIN_STAGE_CARDS: añadir al final, en este orden, cuatro filas.
   - Enchantress con 55001/stage 1, 55002/stage 2 y 55003/stage 3, todas con expectedSetCode 'enchantress_villain' y SIN expertCode. Comentario: el pack no trae set de villano Experto; su Experto cambia de etapa, como Rhino.
   - Loki con code '55027a', stage 1, expectedSetCode 'god_of_lies'. Comentario: decisión del usuario 2026-10-01. Es seleccionable SIN la mecánica del escenario (mismo espíritu que Brigada en 261001-o3p). Las cuatro formas «Avatar of Loki» (55029a–55032a) no se declaran. La vida 20 por héroe sale de la carta real a través de extractStageFields, no de un literal. Por eso Loki NO va en PLACEHOLDER_VILLAINS.

5. VILLAIN_SCENARIOS: añadir al final, en el mismo orden, dos filas.
   - Enchantress: mainSchemeCode '55004a', expectedMainSchemeName 'Prime Real Estate', expectedSetCode 'enchantress_villain', expertStartStage 2, recommendedModuleCode 'trickster_magic'.
   - Loki: mainSchemeCode '55028a', expectedMainSchemeName 'Worlds Collide', expectedSetCode 'god_of_lies', expertStartStage 1, recommendedModuleCode 'trickster_magic'.
   Comentario para Loki: se usa la cara «A» (Worlds Collide) y no la 1A (Mischief and Mayhem), porque en este escenario la línea Contents con el módulo vive en la cara A. La 1A no trae Contents ni módulo. Su único ajuste de Experto es un apego (mecánica fuera de alcance), sin cambio de etapa. De ahí expertStartStage 1.

6. checkMainScheme, recommendedRegex: pasar a /One modular (?:encounter )?set \((?:recommended:\s*)?([^)]+?)\.?\s*\)/. Comentario: 55004a dice «One modular set (...)», sin «encounter». Actualizar también el mensaje de error que cita el patrón.

7. Actualizar los comentarios que enumeran recuentos o villanos, para que no queden desfasados:
   - el encabezado de VILLAIN_STAGE_CARDS («12 filas» → 16);
   - el orden de VILLAIN_SCENARIOS («rhino, klaw, kang, ultron» → añadir enchantress, loki);
   - el recuento de peticiones de main(). Ahora son 24 héroes + 16 etapas estándar + 3 Experto de Kang + 7 planes principales + 8 descargas de pack (core, toafk, twc, tt en EN/ES), unas 58 peticiones y unos 90 s.
   - Mencionar Enchantress en la nota del paso 1 del encabezado CÓMO AÑADIR (el de «caso de Rhino y Ultron»).

NO tocar PLACEHOLDER_VILLAINS, la lógica de emisión ni ningún otro fichero. NO tocar content/marvel-champions.json, y nada de locuciones.

Después ejecutar `npm run catalogue:generate` (red real, unos 90 s, timeout de al menos 180000 ms). Debe imprimir «Escritos 24 héroes, 7 villanos y 9 módulos». Si aborta en una comprobación cruzada, PARAR e informar con el mensaje exacto. No relajar ninguna puerta ni editar el JSON a mano (D-09). Revisar `git diff --numstat -- content/marvel-characters.json`: debe dar solo adiciones más exactamente 1 borrado, el cierre `}` de anachronauts que gana coma. Los bloques nuevos de villano entran entre ultron y brigada-de-demolicion sin tocar sus líneas.

Commit (mensaje en español, estilo del repo): `feat(catalogo): Trickster Takeover (tt) — Enchantress, Loki y módulo Magia embaucadora`. Incluye el script y el JSON juntos.
  </action>
  <verify>
    <automated>cd /Users/vcompanyb/TableGameAssistant && node -e "const c=require('./content/marvel-characters.json');const v=id=>c.villains.find(x=>x.id===id);const e=v('enchantress'),l=v('loki'),m=c.modules.find(x=>x.id==='trickster-magic');const ok=JSON.stringify(c.villains.map(x=>x.id))===JSON.stringify(['rhino','klaw','kang','ultron','enchantress','loki','brigada-de-demolicion'])&&JSON.stringify(e.stages)===JSON.stringify([{stage:1,health:15,healthPerHero:true,healthPerGroup:false},{stage:2,health:16,healthPerHero:true,healthPerGroup:false},{stage:3,health:18,healthPerHero:true,healthPerGroup:false}])&&e.name==='Enchantress'&&e.expertStartStage===2&&e.encounterSetName==='Encantadora'&&e.recommendedModuleId==='trickster-magic'&&JSON.stringify(l.stages)===JSON.stringify([{stage:1,health:20,healthPerHero:true,healthPerGroup:false}])&&l.name==='Loki'&&l.expertStartStage===1&&l.encounterSetName==='Dios de las mentiras'&&l.recommendedModuleId==='trickster-magic'&&JSON.stringify(m)===JSON.stringify({id:'trickster-magic',name:'Magia embaucadora'})&&c.modules.length===9;console.log(ok?'OK':'FALLO');process.exit(ok?0:1)" && test "$(grep -ciE 'prime real estate|worlds collide|charm|hypnotic|god of lies' content/marvel-characters.json)" = "0" && git diff HEAD~1 --numstat -- content/marvel-characters.json</automated>
  </verify>
  <done>El catálogo regenerado por el script trae enchantress (15/16/18 por héroe, expertStartStage 2, «Encantadora», recomendado trickster-magic, sin expert), loki (20 por héroe en una etapa, expertStartStage 1, «Dios de las mentiras», recomendado trickster-magic) y el módulo trickster-magic «Magia embaucadora» sin difficulty. Ningún texto de carta en el JSON. Las filas previas no cambian (numstat: solo adiciones más 1 borrado por la coma). Commit hecho.</done>
</task>

<task type="auto">
  <name>Task 2: Tests de Enchantress, Loki y Magia embaucadora</name>
  <files>engine/__tests__/characters.test.ts, engine/__tests__/counters.test.ts, engine/__tests__/encounterSets.test.ts</files>
  <action>
Ajustar y ampliar los tests con el catálogo real, sin fijar recuentos de personajes (CAT-07; el gate de characters.test.ts lo prohíbe):

engine/__tests__/encounterSets.test.ts:
- El test «klaw: masters-of-evil primero...» compara la lista completa de módulos. Añadir 'trickster-magic' al final del array esperado.
- Nuevo describe «Trickster Takeover (quick 261001-obf)» con tres casos:
  - orderModulesForVillain(catalogue, 'loki') y el mismo para 'enchantress': options[0] es { id: 'trickster-magic', recommended: true }, el resto tiene recommended false, y trickster-magic no lleva clave difficulty.
  - setVillain(baseSession(), 'enchantress') sin moduleIds: resolveModuleIds da ['trickster-magic'].
  - resolveEncounterSetNames da ['Encantadora', 'Normal', 'Magia embaucadora'] en normal y ['Encantadora', 'Normal', 'Experto', 'Magia embaucadora'] en expert. Para Loki: ['Dios de las mentiras', 'Normal', 'Magia embaucadora'].

engine/__tests__/counters.test.ts:
- Añadir las constantes enchantress y loki, junto a las existentes (catalogue.villains.find por id).
- Nuevo describe:
  - computeInitialVillainHealth(enchantress, 3, 'normal') = 45 y (enchantress, 3, 'expert') = 48 (arranca en la etapa II, 16×3);
  - it.each([1,2,3,4]): loki vale 20×n en normal y en expert;
  - setVillain(baseSession(), 'loki') precarga villainHealth 60 (el contexto de este fichero tiene playerCount 3), vía resolveCounterValues.

engine/__tests__/characters.test.ts:
- Nuevo describe «Trickster Takeover (quick 261001-obf)»:
  - enchantress: name 'Enchantress', stages.map(health) [15,16,18], todas con healthPerHero true y healthPerGroup false, ninguna con clave expert, expertStartStage 2, encounterSetName 'Encantadora'.
  - loki: name 'Loki', stages toEqual [{stage:1,health:20,healthPerHero:true,healthPerGroup:false}], expertStartStage 1, encounterSetName 'Dios de las mentiras'.
  - el módulo trickster-magic existe con name 'Magia embaucadora' y sin clave difficulty.
- En el test «recommendedModuleId de rhino/klaw/ultron/kang...», añadir enchantress → 'trickster-magic' y loki → 'trickster-magic' al mapa esperado, y actualizar el título.

Ejecutar `npx vitest run` y `npm run typecheck`: deben pasar los dos. Si algún otro test existente compara la lista completa de villanos o de módulos y falla solo por las entradas nuevas, ampliarlo igual (añadir al final). Cualquier otro fallo se investiga, no se silencia.

Commit: `test(catalogo): Enchantress, Loki y Magia embaucadora en catálogo, contadores y módulos`.
  </action>
  <verify>
    <automated>cd /Users/vcompanyb/TableGameAssistant && npx vitest run && npm run typecheck</automated>
  </verify>
  <done>Toda la suite de Vitest pasa con los casos nuevos de Enchantress/Loki/trickster-magic, y typecheck sale con 0. Ningún test fija un recuento literal de héroes o villanos. Commit hecho.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| MarvelCDB API → script generador | Datos de terceros entran al catálogo versionado (solo en la máquina del desarrollador, nunca en build/CI) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-obf-01 | Information disclosure (copyright) | proyección de cartas en fetch-marvelcdb.mjs | mitigate | Lista blanca CAT-04 intacta: el texto de 55004a/55028a solo se compara en memoria dentro de checkMainScheme. El verify comprueba que el JSON no contiene «Prime Real Estate», «Worlds Collide», «charm», «Hypnotic» ni «God of Lies». |
| T-obf-02 | Tampering (dato a mano desfasado) | VILLAIN_SCENARIOS de Enchantress/Loki | mitigate | checkMainScheme aborta sin escribir si expertStartStage o recommendedModuleCode no coinciden con la carta. La regex ampliada sigue exigiendo que el nombre exacto coincida con card_set_name EN. |
| T-obf-03 | Tampering | ENCOUNTER_MODULES / modular desconocido | mitigate | La puerta existente aborta si `tt` trae un modular que no está en la lista blanca. El esquema Zod (strictObject + superRefine) valida que recommendedModuleId exista en modules. |
| T-obf-SC | Tampering | instalación de paquetes | accept | No se instala ningún paquete en este quick. |
</threat_model>

<verification>
- `npm run catalogue:generate` imprime «Escritos 24 héroes, 7 villanos y 9 módulos» sin abortar.
- `git diff --numstat` del JSON: solo adiciones más 1 borrado (la coma de anachronauts).
- `npx vitest run` y `npm run typecheck` en verde.
- `git diff --stat HEAD~2 -- content/marvel-champions.json` vacío.
</verification>

<success_criteria>
- Enchantress y Loki elegibles en el selector de villano, con vida inicial correcta en Normal y Experto.
- «Magia embaucadora» en el selector de módulos, recomendada para los dos villanos nuevos.
- Catálogo generado solo por el script (D-09), sin texto de carta (CAT-04), con los datos previos intactos.
</success_criteria>

<output>
Create `.planning/quick/261001-obf-trickster-takeover/261001-obf-SUMMARY.md` when done
</output>
