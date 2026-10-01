---
phase: quick-261001-luc
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/catalogue/fetch-marvelcdb.mjs
  - content/marvel-characters.json
  - app/data/spanish-hero-aliases.ts
  - app/composables/__tests__/useHeroSearch.test.ts
  - app/components/PlayerModal.vue
autonomous: true
requirements: [CAT-07]

must_haves:
  truths:
    - "Nightcrawler aparece en el modal de selección de héroe con el rótulo «Rondador Nocturno»"
    - "Buscar «rondador» o «nightcrawler» en el modal lo encuentra"
    - "El catálogo tiene 24 héroes y la única diferencia con el anterior es la fila de Nightcrawler"
    - "La suite de tests completa pasa"
  artifacts:
    - path: "scripts/catalogue/fetch-marvelcdb.mjs"
      provides: "Fila de HERO_CARDS para Nightcrawler"
      contains: "{ code: '48001a', expectedName: 'Nightcrawler' }"
    - path: "content/marvel-characters.json"
      provides: "Héroe nightcrawler generado por el script (nunca editado a mano)"
      contains: "\"id\": \"nightcrawler\""
    - path: "app/data/spanish-hero-aliases.ts"
      provides: "Alias español"
      contains: "'nightcrawler': 'Rondador Nocturno'"
  key_links:
    - from: "app/data/spanish-hero-aliases.ts"
      to: "content/marvel-characters.json"
      via: "clave = id del catálogo"
      pattern: "'nightcrawler'"
---

<objective>
Añadir a Nightcrawler (pack MarvelCDB `ncrawler`, carta héroe `48001a`) a los héroes seleccionables, siguiendo el proceso documentado en la cabecera «CÓMO AÑADIR UN HÉROE O VILLANO NUEVO (CAT-07)» de `scripts/catalogue/fetch-marvelcdb.mjs`.

Purpose: el grupo tiene el pack y quiere elegirlo en la mesa.
Output: catálogo regenerado con 24 héroes, alias español «Rondador Nocturno», tests/comentarios actualizados de 23 a 24.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md

Datos verificados contra la API pública de MarvelCDB el 2026-10-01 (orquestador):
- `GET https://marvelcdb.com/api/public/card/48001a.json` → name "Nightcrawler", type_code hero, health 9, hand_size 5; linked_card alter ego "Kurt Wagner", hand_size 6.
- Resultado esperado en `content/marvel-characters.json` tras regenerar (al final del array `heroes`, después de `jubilee`): id `nightcrawler`, name `Nightcrawler`, alterEgo `Kurt Wagner`, health 9, handSizeHero 5, handSizeAlterEgo 6.

Comprobado por el planificador:
- Ningún paso de `content/marvel-champions.json` depende de héroes concretos (grep de `jubilee` fuera de catálogo/alias/script no da nada) — no hay que tocar el contenido de pasos.
- `app/composables/__tests__/useGameContent.test.ts` solo comprueba `heroes.length > 0` — no cambia.
- Referencias a «23» que cambian: `fetch-marvelcdb.mjs` línea ~134 («23 filas», «18 de packs sueltos») y línea ~521 («~46 códigos (23 héroes + …»); `useHeroSearch.test.ts` líneas ~102-115; `PlayerModal.vue` línea ~177; `spanish-hero-aliases.ts` línea ~14 (esta última es histórica — ver Task 2).
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fila de Nightcrawler en HERO_CARDS y regeneración del catálogo</name>
  <files>scripts/catalogue/fetch-marvelcdb.mjs, content/marvel-characters.json</files>
  <action>
En `scripts/catalogue/fetch-marvelcdb.mjs`:
- Añadir `{ code: '48001a', expectedName: 'Nightcrawler' },` como última fila de `HERO_CARDS`, justo después de la de Jubilee (`47001a`). Sufijo `a` (lado héroe con `linked_card`), como exige la cabecera.
- Actualizar el comentario encima de `HERO_CARDS`: «23 filas» → «24 filas» y «18 de packs sueltos» → «19 de packs sueltos».
- Actualizar el comentario de `main()` (~línea 521): «~46 códigos (23 héroes + …» → «~47 códigos (24 héroes + …». No tocar nada más del script.

Después ejecutar `npm run catalogue:generate` (necesita red). Si falla por red, PARAR y reportarlo — NUNCA editar `content/marvel-characters.json` a mano (D-09). Revisar `git diff content/marvel-characters.json`: debe añadir exactamente el objeto de Nightcrawler (id `nightcrawler`, alterEgo `Kurt Wagner`, health 9, handSizeHero 5, handSizeAlterEgo 6) al final de `heroes` más la coma tras `jubilee`, sin ningún otro cambio (D-10). Si el diff toca cualquier otra cosa (p. ej. cambió un dato remoto de otra carta), parar y reportarlo en vez de commitear.
  </action>
  <verify>
    <automated>cd /Users/vcompanyb/TableGameAssistant && git diff --numstat content/marvel-characters.json && grep -c "'48001a'" scripts/catalogue/fetch-marvelcdb.mjs && node -e "const c=require('./content/marvel-characters.json');const h=c.heroes.find(x=>x.id==='nightcrawler');if(c.heroes.length!==24||!h||h.alterEgo!=='Kurt Wagner'||h.health!==9||h.handSizeHero!==5||h.handSizeAlterEgo!==6)process.exit(1);console.log('ok')"</automated>
  </verify>
  <done>El script tiene la fila 48001a y comentarios en 24/19/~47; el JSON regenerado tiene 24 héroes y el diff solo añade Nightcrawler (≈8 líneas añadidas, 1 modificada).</done>
</task>

<task type="auto">
  <name>Task 2: Alias español y recuentos de 23 a 24</name>
  <files>app/data/spanish-hero-aliases.ts, app/composables/__tests__/useHeroSearch.test.ts, app/components/PlayerModal.vue</files>
  <action>
- `app/data/spanish-hero-aliases.ts`: añadir `'nightcrawler': 'Rondador Nocturno',` como última entrada del mapa (después de `'jubilee'`). En el comentario de cabecera, conservar el párrafo histórico de la revisión D-07 del 2026-09-08 (las «23 filas» se refieren a lo que se revisó entonces — no cambiarlo), pero sustituir la frase final «Ya no hay nada pendiente de confirmar en este fichero.» por una nota que diga que esas 23 quedaron sin nada pendiente y que la fila `nightcrawler` → «Rondador Nocturno» se añadió después (quick 261001-luc, 2026-10-01) con el nombre oficial en español y está PENDIENTE de que el usuario la contraste con la carta física del grupo.
- `app/composables/__tests__/useHeroSearch.test.ts`: cambiar los 23 por 24 en el comentario (~línea 102), el título del test `'los 23 héroes conocidos tienen entrada en el mapa'`, `expect(heroIds.length).toBe(23)`, el título `'devuelve 23 opciones'` y `expect(heroOptions.length).toBe(23)`.
- `app/components/PlayerModal.vue` (~línea 177): en el comentario «siempre trae sus 23 héroes» → «24 héroes». Solo el comentario.

Luego ejecutar la suite completa y el typecheck. El test de orden por `localeCompare('es')` debe seguir pasando sin cambios (el orden se calcula, no está fijado).
  </action>
  <verify>
    <automated>cd /Users/vcompanyb/TableGameAssistant && npx vitest run && npm run typecheck && grep -c "'nightcrawler': 'Rondador Nocturno'" app/data/spanish-hero-aliases.ts</automated>
  </verify>
  <done>Toda la suite de Vitest pasa con los 24 héroes, typecheck limpio, alias presente y cabecera marcando la fila como pendiente de comprobación del usuario. Un único commit con todo: `feat(catalogo): Nightcrawler entra en los héroes seleccionables como «Rondador Nocturno»` (script + JSON juntos, como pide el paso 4 de la cabecera del generador).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| MarvelCDB API → script generador (solo máquina de desarrollo) | Datos remotos entran en un JSON versionado |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-261001-01 | Tampering | content/marvel-characters.json | mitigate | El script valida `expectedName` y aborta sin escritura parcial; revisión del diff exige que solo se añada la fila de Nightcrawler |
| T-261001-02 | Tampering | dependencias | accept | No se instala ningún paquete nuevo |
</threat_model>

<verification>
- `npx vitest run` pasa entero; `npm run typecheck` limpio.
- `git diff` de `content/marvel-characters.json` añade solo Nightcrawler.
- `grep -rnE "23 (héroes|filas|opciones)|toBe\(23\)" app scripts` solo devuelve la línea histórica de la revisión D-07 en `spanish-hero-aliases.ts`.
</verification>

<success_criteria>
Nightcrawler seleccionable en el modal de jugador como «Rondador Nocturno», con datos (salud 9, mano 5/6, alter ego Kurt Wagner) generados por el script desde MarvelCDB, tests en verde.
</success_criteria>

<output>
Create `.planning/quick/261001-luc-nightcrawler/261001-luc-SUMMARY.md` when done
</output>
