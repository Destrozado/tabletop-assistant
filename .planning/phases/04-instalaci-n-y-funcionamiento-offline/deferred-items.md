# Deferred Items — Fase 4

Elementos detectados durante la ejecución que están fuera del alcance de la
tarea que los descubrió (Regla de scope boundary del executor). No se han
arreglado — solo se dejan constancia aquí.

## `e2e/offline-flow.spec.ts` — locator de botón desactualizado (detectado en plan 04-05)

**Fichero:** `e2e/offline-flow.spec.ts` (propiedad del plan 04-03, fuera del
alcance de ficheros del plan 04-05).

**Síntoma:** El test "selector -> mini-setup -> preparación con la red
cortada..." falla en el paso 3 (`await expect(gameButton).toBeVisible()`)
buscando un botón con nombre accesible `'Marvel Champions: El Juego de
Cartas'`, pero el DOM real renderiza el botón como `"Marvel Champions"` a
secas (confirmado con el `error-context.md` de Playwright: `button "Marvel
Champions"`).

**No relacionado con el plan 04-05:** confirmado moviendo temporalmente
`app/app.vue`, `app/components/UpdateBanner.vue` y
`e2e/update-banner.spec.ts` fuera del árbol de trabajo (dejando el repo en el
estado exacto del commit `7d9c869`, sin ningún cambio de la Task 2 de este
plan) y volviendo a ejecutar `npx playwright test e2e/offline-flow.spec.ts`:
el mismo test falla exactamente igual, con el mismo locator y el mismo DOM.
Es un desajuste de texto preexistente entre el test y
`GameSelectorScreen.vue`/el contenido real, no una regresión de PWA/offline
ni de la banda de actualización.

**Impacto en este plan:** el acceptance criteria de la Task 2 de 04-05
("`npx playwright test` termina con código 0 con los tres ficheros spec en
verde") no se cumple al 100% por esta causa ajena — `pwa-install.spec.ts` y
`update-banner.spec.ts` (los dos específicos de este plan) están en verde;
`offline-flow.spec.ts` tiene 1 test roto de 2 por este motivo, no relacionado
con OFF-04 ni con la banda de actualización.

**Quién debería resolverlo:** quien mantenga `e2e/offline-flow.spec.ts`
(plan 04-03 ya cerrado) o el plan 04-06 (checkpoint de cierre de fase), que
debería, o bien actualizar el nombre accesible esperado a `'Marvel
Champions'`, o bien investigar por qué el texto extendido
`': El Juego de Cartas'` no se está renderizando si se esperaba que
apareciera.
