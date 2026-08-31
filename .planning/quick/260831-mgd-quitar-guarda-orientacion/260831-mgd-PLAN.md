---
quick_id: 260831-mgd
slug: quitar-guarda-orientacion
phase: quick-260831-mgd
plan: 1
wave: 1
depends_on: []
type: execute
autonomous: true
requirements: [UI-04]
files_modified:
  - e2e/portrait-usable.spec.ts
  - app/app.vue
  - playwright.config.ts
  - .planning/REQUIREMENTS.md

must_haves:
  truths:
    - "Con la tablet en vertical (820x1180) la app se ve y se usa: el selector, el mini-setup y la pantalla de juego responden igual que en horizontal"
    - "Ya no existe en ninguna parte el overlay «Girad la tablet»"
    - "En vertical no aparece scroll horizontal en ninguna de las tres pantallas, ni en tablet (820x1180) ni en móvil (412x915)"
    - "Nada cambia en horizontal: las 9 pruebas de navegador existentes y los 293 tests unitarios siguen en verde sin tocarlos"
    - "La app se sigue pudiendo instalar: el `<link rel=\"manifest\">` sigue en el HTML y el manifiesto sigue sin `orientation`"
    - "REQUIREMENTS.md ya no afirma que la interfaz no se reorganiza al rotar, y explica por qué en su lugar"
  artifacts:
    - path: "e2e/portrait-usable.spec.ts"
      provides: "prueba de regresión de la orientación vertical en viewport real (tablet y móvil)"
      contains: "portrait-usable"
    - path: "app/app.vue"
      provides: "raíz de la app sin guarda de orientación"
      contains: "id=\"app-root\""
    - path: ".planning/REQUIREMENTS.md"
      provides: "UI-04 y la fila de no-objetivo reescritas conforme a D-08"
      contains: "UI-04"
  key_links:
    - from: "e2e/portrait-usable.spec.ts"
      to: "#app-root de app/app.vue"
      via: "aserción de visibilidad en viewport vertical"
      pattern: "#app-root"
    - from: "app/app.vue"
      to: "<NuxtPwaManifest />"
      via: "componente intacto por encima de #app-root — sin él la PWA deja de ser instalable"
      pattern: "NuxtPwaManifest"
---

<objective>
Retirar la guarda de orientación para que la app se pueda usar en vertical.

Purpose: hoy la app se contradice a sí misma. El manifiesto **no** fuerza la orientación (D-08 de
la Fase 4, decisión explícita del usuario: *"si alguien la quiere usar en el móvil que pueda
hacerlo sin problemas, lo verá peor pero es un tema de espacio, yo no forzaría nada"*), pero el
CSS sí: en vertical la app entera se oculta tras un cartel de «Girad la tablet». Este plan
elimina esa contradicción por el lado del CSS.

Output: `app/app.vue` sin la guarda, la documentación que la describía puesta al día, y una
prueba de navegador que impide que vuelva a colarse.

Esto es un cambio pequeño y ya medido, no una exploración: la guarda es puramente CSS (dos
clases de Tailwind, cero JavaScript) y el comportamiento en vertical ya se verificó con
Playwright contra un build real de `nuxt generate`, con la guarda desactivada por CSS inyectado.
Ver `<evidencia_ya_recogida>`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@CLAUDE.md
@app/app.vue
@playwright.config.ts
@e2e/offline-flow.spec.ts

<interfaces>
<!-- Contratos ya verificados leyendo el código. El ejecutor NO necesita ir a buscarlos. -->

app/app.vue (47 líneas, es el fichero entero) — cuatro elementos dentro de un `<div>` raíz:
  1. Un comentario largo "Rule 2 (04-02)" sobre `<NuxtPwaManifest />`  → INTACTO
  2. `<NuxtPwaManifest />` (línea 12)                                   → INTACTO, y en su sitio
  3. `<div id="app-root" class="portrait:hidden">` (línea 13), que contiene un comentario
     sobre la banda, `<ClientOnly><UpdateBanner /></ClientOnly>` y `<NuxtPage />`
     → se le quita SOLO el atributo `class`; su contenido queda byte a byte igual
  4. El comentario "Guardia de orientación (UI-04)" (líneas 29-34) y el
     `<div id="orientation-guard" ...>` (líneas 35-45) con el `<h1>Girad la tablet</h1>` y
     el `<p>Esta aplicación se usa en horizontal.</p>`                 → SE BORRAN ENTEROS

playwright.config.ts — `use.viewport` es `{ width: 1280, height: 800 }` y lleva encima un
  comentario de cinco líneas que justifica ese valor diciendo que app/app.vue oculta #app-root
  con `portrait:hidden`. Ese comentario queda FALSO tras este cambio; el valor 1280x800 NO.

playwright.config.ts — `testDir: './e2e'`, `baseURL: 'http://localhost:4173'`,
  `workers: 1`, `fullyParallel: false`, y un `webServer` que corre
  `npm run generate && npx nuxi preview`. Las specs corren contra el build REAL, no contra
  `nuxt dev`. Un `npx playwright test` tarda minutos porque regenera el sitio.

vitest.config.ts — dos proyectos, `engine/**/*.test.ts` y `app/**/*.test.ts`. NO hay colisión
  con `e2e/**/*.spec.ts`: el fichero nuevo no exige tocar la configuración de Vitest.

Selectores reales de la app, copiados de e2e/offline-flow.spec.ts (ya verificados allí):
  - Selector:   page.getByRole('button', { name: 'Marvel Champions', exact: true })
  - Mini-setup: page.getByText('Nº de jugadores')
                page.getByRole('button', { name: '2', exact: true })
                page.getByRole('button', { name: 'Normal', exact: true })
                page.getByRole('button', { name: 'EMPEZAR PREPARACIÓN ›' })
  - Juego:      page.getByRole('button', { name: 'SIGUIENTE ›' })
                page.getByRole('button', { name: '‹ Atrás' })
                page.locator('main p.text-display')   // texto del paso
  - Reanudación (si hay partida guardada): page.getByText('Partida guardada')

.planning/REQUIREMENTS.md — dos líneas exactas a reescribir:
  línea 73:  - [x] **UI-04**: La interfaz se presenta en horizontal y no se reorganiza al rotar el dispositivo
  línea 144: | Modo retrato | La tablet se apoya en horizontal junto a la mesa; permitir la rotación es una fuente de bugs documentada, no una función |

Base que NO puede empeorar: `npm run test` -> 293/293, `npx playwright test` -> 9/9.
</interfaces>
</context>

<evidencia_ya_recogida>
Medido con Playwright contra un build real de `nuxt generate`, con la guarda neutralizada por
CSS inyectado. El ejecutor NO tiene que volver a medir esto; es el punto de partida.

| Viewport | Resultado |
|---|---|
| Tablet 820x1180 | Selector, mini-setup y pantalla de juego renderizan bien. La cabecera muestra `PREPARACIÓN · 1 de 23` completo. Texto grande legible, ATRÁS/SIGUIENTE a todo el ancho. |
| Móvil 412x915 | Renderiza y es usable. **Una degradación:** la cabecera trunca `PREPARACIÓN · 1 de 23` a `PREPAR...`, perdiendo el contador de paso. |
| Ambos | `scrollWidth > clientWidth` -> **false**. `body.scrollHeight > innerHeight` -> **false**. Ni scroll horizontal ni vertical. |

`e2e/pwa-install.spec.ts` NO depende de la guarda: su única referencia a la orientación es
comprobar que el manifiesto no tiene propiedad `orientation` (D-08). Esa aserción sigue siendo
correcta y no se toca.
</evidencia_ya_recogida>

<decisions>
Decisiones tomadas en la planificación. El ejecutor las aplica, no las revisita.

**D-Q1 — El truncamiento de la cabecera en móvil (412px) es un resultado ACEPTADO, no un
defecto que arreglar en esta tarea.** El usuario lo vio antes de decidir: *"hay dispositivos
tablet suficientemente grandes como para en vertical poder usar la APP y no hace daño a nadie...
si lo tienes vertical y se ve mal, ya probarás a rotarlo"*. Concuerda con D-08 de la Fase 4:
*"que la app se vea peor en móvil es **aceptable y esperado**, no un defecto a corregir. No hay
trabajo responsive en esta fase."* **Prohibido** tocar la cabecera, los tamaños de fuente, los
breakpoints o cualquier CSS de layout en este plan. Si el ejecutor siente la tentación de
"aprovechar y arreglar la cabecera", la respuesta es no: eso sería trabajo responsive, que está
explícitamente fuera de alcance.

**D-Q2 — La prueba se escribe ANTES de retirar la guarda, y debe verse fallar.** Una prueba de
regresión que nunca se vio en rojo no demuestra que detecte nada. Con la guarda todavía puesta,
la spec nueva debe fallar porque `#app-root` está oculto; solo entonces la Tarea 2 la pone en
verde. Esto también descarta el falso positivo de una spec que pase por accidente (selector mal
escrito que no comprueba lo que dice comprobar).

**D-Q3 — La spec nueva sobrescribe el viewport con `test.use`; el `viewport` por defecto de
`playwright.config.ts` se queda en 1280x800.** Es la orientación real de uso y la que asumen las
otras tres specs. Cambiar el valor por defecto arrastraría a las 9 pruebas existentes a un
escenario que nadie ha pedido validar. Lo que sí cambia en `playwright.config.ts` es el
**comentario** que lo justifica, que a partir de este plan sería mentira.

**D-Q4 — Solo se asserta la ausencia de scroll HORIZONTAL, no la de vertical.** El scroll
horizontal es la señal real de "el layout se rompe en estrecho". El vertical hoy también es
falso (ver evidencia), pero assertarlo sería frágil: un paso con texto más largo podría
legítimamente necesitar scroll vertical en el futuro y haría fallar la prueba sin que nada esté
roto.

**D-Q5 — Los artefactos históricos de planificación NO se reescriben.** `01-01-PLAN.md`,
`01-UI-SPEC.md` y `04-PATTERNS.md` mencionan la guarda; son el registro de lo que era cierto
cuando se escribieron y se dejan como están (convención GSD: los PLAN y SUMMARY son historia,
no documentación viva). La fuente de verdad viva es `.planning/REQUIREMENTS.md`, y esa sí se
actualiza. Nota consciente: `01-UI-SPEC.md` sugería que la Fase 4 podría añadir un
`orientation: landscape` al manifiesto; D-08 ya decidió lo contrario y este plan lo confirma.
</decisions>

<prohibiciones>
Barreras duras. Romper cualquiera de estas es motivo de rehacer el cambio.

1. **`<NuxtPwaManifest />` no se mueve, no se envuelve, no se toca.** Sigue siendo hermano
   directo dentro del `<div>` raíz y por ENCIMA de `#app-root`. Sin él no hay
   `<link rel="manifest">` y la app deja de ser instalable — se descubrió por las malas en el
   plan 04-02.
2. **El manifiesto sigue SIN propiedad `orientation`.** No se añade `orientation: 'portrait'`
   ni `'any'` ni nada: D-08 dice no forzar, y "no forzar" se expresa por ausencia. La aserción
   `expect(manifest).not.toHaveProperty('orientation')` de `e2e/pwa-install.spec.ts` no se toca.
3. **El bloque `<ClientOnly><UpdateBanner /></ClientOnly>` y su comentario quedan byte a byte
   idénticos**, igual que el comentario "Rule 2 (04-02)".
4. **Ninguna spec existente se modifica.** `pwa-install.spec.ts`, `offline-flow.spec.ts` y
   `update-banner.spec.ts` no se abren para editar.
5. **Cero CSS de layout nuevo.** Este plan solo QUITA clases; no añade ni una (ver D-Q1).
</prohibiciones>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Spec de regresión en vertical, vista fallar con la guarda todavía puesta (RED)</name>
  <files>e2e/portrait-usable.spec.ts</files>

  <read_first>
    - `e2e/offline-flow.spec.ts` — de dónde salen los selectores exactos y el estilo de
      comentario-cabecera de las specs de este proyecto.
    - `playwright.config.ts` — `testDir`, `baseURL`, `workers: 1`, y el `webServer` que
      regenera el sitio en cada arranque.
    - `app/app.vue` — para confirmar que `#app-root` y `#orientation-guard` siguen ahí antes
      de escribir las aserciones.
  </read_first>

  <behavior>
    - Tablet vertical 820x1180: `#app-root` es visible; `#orientation-guard` no existe en el
      DOM; el botón «Marvel Champions» del selector es visible.
    - Tablet vertical 820x1180: se completa el recorrido selector -> mini-setup -> pantalla de
      juego y SIGUIENTE/Atrás son visibles.
    - Tablet vertical 820x1180: en la pantalla de juego no hay scroll horizontal.
    - Móvil vertical 412x915: la app renderiza (el selector es visible) y no hay scroll
      horizontal. Sin aserciones sobre el texto de la cabecera (D-Q1).
  </behavior>

  <action>
    Crear `e2e/portrait-usable.spec.ts` con exactamente **2 tests**, repartidos en dos
    `test.describe` porque cada uno necesita un viewport distinto vía `test.use({ viewport })`
    a nivel de describe (D-Q3 — no tocar el viewport por defecto del config).

    Cabecera del fichero, en el estilo de las otras specs: comentario explicando que esta spec
    existe para impedir que vuelva la guarda de orientación retirada en la quick 260831-mgd,
    que se alinea con D-08 de la Fase 4, y que el truncamiento de la cabecera en 412px es un
    resultado aceptado y por eso aquí NO se assertan textos de cabecera (D-Q1).

    Describe 1 — `test.use({ viewport: { width: 820, height: 1180 } })`, tablet en vertical.
    Un único test que en este orden:
      1. `await page.goto('/')`.
      2. `await expect(page.locator('#app-root')).toBeVisible()` — la aserción central: es
         justo lo que `portrait:hidden` hacía imposible.
      3. `await expect(page.locator('#orientation-guard')).toHaveCount(0)` — la guarda no
         existe ni oculta.
      4. Selector: el botón «Marvel Champions» visible, y clic.
      5. Mini-setup: «Nº de jugadores» visible; pulsar «2», «Normal», «EMPEZAR PREPARACIÓN ›».
         Defensa contra el estado que dejan otras specs (`workers: 1`, mismo perfil de
         navegador, `localStorage` compartido): si aparece «Partida guardada», la partida
         previa se descarta o se continúa antes de seguir — resolverlo con un locator `.or()`
         como ya hace `offline-flow.spec.ts` en su segundo test, o limpiando `localStorage`
         antes del `goto`. Elegir UNA de las dos y dejarlo comentado.
      6. Pantalla de juego: `SIGUIENTE ›` y `‹ Atrás` visibles, y `main p.text-display` con
         texto no vacío.
      7. Sin scroll horizontal, medido con
         `page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)`
         y esperado `false`. Mensaje de fallo que incluya `scrollWidth` y `clientWidth` reales
         para que un fallo futuro se diagnostique sin reproducirlo a mano.

    Describe 2 — `test.use({ viewport: { width: 412, height: 915 } })`, móvil en vertical.
    Un único test: `goto('/')`, `#app-root` visible, botón «Marvel Champions» visible, y la
    misma medición de scroll horizontal esperando `false`. Nada más — el móvil solo tiene que
    renderizar y no desbordar (D-Q1).

    NO retirar todavía la guarda de `app/app.vue`. Esta tarea acaba en rojo a propósito.
  </action>

  <verify>
    <automated>npx playwright test e2e/portrait-usable.spec.ts</automated>
  </verify>

  <acceptance_criteria>
    - `e2e/portrait-usable.spec.ts` existe y `grep -c "^  test(\|^    test(" e2e/portrait-usable.spec.ts` es coherente con 2 tests declarados.
    - `npx playwright test e2e/portrait-usable.spec.ts` termina con **2 failed** (o 1 failed si
      Playwright corta antes; lo que NO puede es pasar).
    - El motivo del fallo, leído en la salida, es que `#app-root` no es visible / está oculto —
      NO un selector inexistente, un timeout de navegación ni un error de compilación de
      TypeScript. Si el fallo es por otra causa, la spec está mal escrita: arreglarla y repetir
      hasta que falle por el motivo correcto.
    - `git status --porcelain` muestra un único fichero nuevo: `e2e/portrait-usable.spec.ts`.
  </acceptance_criteria>

  <done>La spec de regresión existe, corre, y falla exactamente porque la guarda de orientación esconde la app en vertical — la prueba de que sirve para algo.</done>
</task>

<task type="auto">
  <name>Task 2: Retirar la guarda y poner al día la documentación que la describía (GREEN)</name>
  <files>app/app.vue, playwright.config.ts, .planning/REQUIREMENTS.md</files>

  <read_first>
    - `app/app.vue` completo (47 líneas) — hay que distinguir con precisión qué comentario se
      borra (el de la guarda) y cuáles se conservan intactos (el de `NuxtPwaManifest`, el de la
      banda de actualización).
    - `playwright.config.ts` líneas 11-18 — el comentario del viewport que queda obsoleto.
    - `.planning/REQUIREMENTS.md` líneas 68-78 (bloque «Interfaz en tablet») y 135-147 (tabla
      «Out of Scope») — para respetar el formato de checkbox y de tabla.
    - Las secciones `<prohibiciones>` y `<decisions>` de este plan antes de tocar nada.
  </read_first>

  <action>
    **1. `app/app.vue`** — dos ediciones y ninguna más:
      a. Línea 13: `<div id="app-root" class="portrait:hidden">` pasa a ser
         `<div id="app-root">`. Se conserva el `id`: es el punto de anclaje de la spec de la
         Tarea 1.
      b. Borrar el bloque completo de las líneas 29-45: el comentario «Guardia de orientación
         (UI-04) ...» y el `<div id="orientation-guard">` entero con su `<h1>` y su `<p>`.
         Borrar también la línea en blanco que lo separaba, sin dejar dos líneas vacías
         seguidas.
      El resultado es un `<template>` con `<div>` raíz que contiene: el comentario "Rule 2
      (04-02)", `<NuxtPwaManifest />`, y `<div id="app-root">` con su comentario de la banda,
      `<ClientOnly><UpdateBanner /></ClientOnly>` y `<NuxtPage />`. Nada más.

    **2. `playwright.config.ts`** — sustituir SOLO el comentario de cinco líneas que hay encima
    de `viewport: { width: 1280, height: 800 }`. El valor 1280x800 NO cambia (D-Q3). El
    comentario nuevo debe decir: que el viewport apaisado por defecto es la orientación real de
    uso y la que asumen las specs de PWA/offline; que **ya no es obligatorio** porque la guarda
    `portrait:hidden` se retiró en la quick 260831-mgd alineándose con D-08; y que
    `e2e/portrait-usable.spec.ts` sobrescribe este viewport con `test.use` para cubrir el caso
    vertical.

    **3. `.planning/REQUIREMENTS.md`** — reescribir dos líneas, conservando el `- [x]` y el
    formato de tabla. No borrar UI-04: es un requisito con historia y con entrada en la tabla
    de trazabilidad (línea 197), que se queda como está.
      a. Línea 73, nuevo texto:
         `- [x] **UI-04**: La interfaz está optimizada para horizontal y en vertical sigue siendo utilizable: no hay ninguna guarda que oculte la app al rotar el dispositivo (D-08, Fase 4)`
      b. Línea 144, fila de la tabla «Out of Scope». Cambia también el título de la fila,
         porque el modo retrato ya no está excluido — lo que sigue excluido es el trabajo de
         adaptarlo:
         `| Trabajo responsive para retrato y móvil | Usar la app en vertical está permitido y no se bloquea (D-08, Fase 4), pero el diseño se optimiza para la tablet en horizontal, que es como se usa junto a la mesa. En pantallas estrechas se ve peor —la cabecera llega a truncar `PREPARACIÓN · 1 de 23`— y eso es aceptable y esperado, no un defecto a corregir |`

    No tocar ningún otro fichero. En particular, ningún artefacto histórico de
    `.planning/phases/` (D-Q5) y ninguna spec existente.
  </action>

  <verify>
    <automated>grep -c "portrait:hidden\|orientation-guard\|Girad la tablet" app/app.vue; grep -c "NuxtPwaManifest" app/app.vue; npm run test; npx playwright test</automated>
  </verify>

  <acceptance_criteria>
    - `grep -n "portrait:hidden\|portrait:flex\|orientation-guard\|Girad la tablet" app/app.vue`
      no devuelve **nada** (salida vacía, código de salida 1).
    - `grep -rn "portrait:hidden\|portrait:flex" --include="*.vue" --include="*.ts" --include="*.css" app/ e2e/ playwright.config.ts nuxt.config.ts`
      no devuelve nada — no queda ninguna referencia viva a la guarda fuera de los históricos
      de `.planning/phases/`.
    - `grep -c "NuxtPwaManifest" app/app.vue` devuelve `1`, y
      `grep -n "NuxtPwaManifest\|app-root" app/app.vue` muestra `NuxtPwaManifest` en una línea
      **anterior** a la de `id="app-root"` (prohibición 1).
    - `grep -n "id=\"app-root\"" app/app.vue` devuelve exactamente `<div id="app-root">`, sin
      atributo `class`.
    - `grep -c "UpdateBanner" app/app.vue` devuelve `1` y `git diff app/app.vue` NO muestra
      ninguna línea modificada dentro del bloque `<ClientOnly>` ni en el comentario "Rule 2".
    - `grep -n "orientation" playwright.config.ts nuxt.config.ts` no muestra ninguna propiedad
      `orientation` añadida al manifiesto (prohibición 2); si aparece la palabra, es solo en
      prosa de comentario.
    - `grep -n "1280" playwright.config.ts` sigue mostrando `viewport: { width: 1280, height: 800 }`.
    - `grep -n "UI-04" .planning/REQUIREMENTS.md` muestra la línea reescrita, empezando por
      `- [x] **UI-04**`, sin la frase «no se reorganiza al rotar el dispositivo».
    - `grep -n "Modo retrato" .planning/REQUIREMENTS.md` no devuelve nada, y
      `grep -n "Trabajo responsive" .planning/REQUIREMENTS.md` devuelve la fila nueva, que
      menciona `D-08`.
    - `npm run test` -> **293 passed** como mínimo (base intacta; este plan no añade tests de
      Vitest, así que el número esperado es exactamente 293).
    - `npx playwright test` -> **11 passed, 0 failed** (los 9 de base más los 2 de la Tarea 1,
      ahora en verde). Los 9 existentes deben pasar sin haber sido tocados.
    - `git diff --stat` muestra exactamente 4 ficheros entre modificados y nuevos:
      `app/app.vue`, `playwright.config.ts`, `.planning/REQUIREMENTS.md`,
      `e2e/portrait-usable.spec.ts`.
  </acceptance_criteria>

  <done>La app se usa en vertical, la spec de la Tarea 1 pasa, las 9 pruebas de navegador y los 293 tests unitarios siguen en verde, y ningún documento vivo sigue afirmando que la app se bloquea al rotar.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

Ninguna nueva. El cambio retira CSS y edita documentación; no añade entrada de usuario, no
añade red, no añade dependencias (`package.json` no se toca, así que no aplica la puerta de
legitimidad de paquetes).

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-mgd-01 | Denial of Service (autoinfligido) | `app/app.vue` — borrar de más y arrastrar `<NuxtPwaManifest />` al quitar el bloque vecino | mitigate | Prohibición 1 + criterio de aceptación con `grep -c "NuxtPwaManifest"` = 1 y orden verificado respecto a `#app-root`; además `e2e/pwa-install.spec.ts` (test 4) falla si desaparece el `<link>` |
| T-mgd-02 | Tampering | Suite de pruebas: "arreglar" un fallo relajando una aserción existente | accept | Prohibición 4 (ninguna spec existente se edita) + `git diff --stat` acotado a 4 ficheros |
| T-mgd-SC | Tampering | Instalaciones de npm/pip/cargo | n/a | Este plan no instala ningún paquete |
</threat_model>

<verification>
Al terminar los dos tasks, todo esto debe ser cierto a la vez:

1. `npm run test` -> 293 passed (base intacta).
2. `npx playwright test` -> 11 passed, 0 failed (9 de base + 2 nuevos).
3. `npm run generate` completa sin error.
4. `grep -rn "portrait:hidden\|orientation-guard" app/ e2e/ *.ts` -> sin resultados.
5. `grep -c "NuxtPwaManifest" app/app.vue` -> 1, y aparece antes que `#app-root`.
6. El manifiesto sigue sin `orientation` — lo demuestra el test 2 de `e2e/pwa-install.spec.ts`,
   que debe estar entre los 11 en verde.
7. `git diff --stat` -> exactamente 4 ficheros.
</verification>

<success_criteria>
- Con la tablet en vertical, la app se ve y se juega de principio a fin; el cartel «Girad la
  tablet» no existe en ninguna parte del código vivo.
- En horizontal no ha cambiado absolutamente nada: mismos 293 tests unitarios y mismas 9
  pruebas de navegador en verde, sin editar ninguna.
- La app sigue siendo instalable como PWA y su manifiesto sigue sin forzar orientación (D-08).
- `.planning/REQUIREMENTS.md` describe el comportamiento real: UI-04 reescrito y el no-objetivo
  acotado a «trabajo responsive», no a «modo retrato».
- Existe una prueba de navegador que se vio fallar con la guarda puesta y pasar sin ella, así
  que la guarda no puede volver por descuido.
</success_criteria>

<output>
Crear `.planning/quick/260831-mgd-quitar-guarda-orientacion/260831-mgd-SUMMARY.md` al terminar.
</output>
