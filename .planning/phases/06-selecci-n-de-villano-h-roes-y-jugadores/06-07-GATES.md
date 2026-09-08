# Plan 06-07 · Task 1 — Barrido de gates mecánicos

**Ejecutado:** 2026-09-08, run autónomo nocturno · por el orquestador, no por un subagente
**Estado del plan 06-07:** **INCOMPLETO**. Task 1 (este barrido) hecha; Task 2
(revisión humana en navegador, `checkpoint:human-verify`) **pendiente del usuario**.

> Este fichero NO es `06-07-SUMMARY.md` a propósito. En GSD la existencia de un
> `SUMMARY.md` marca el plan como completo, y no lo está. Cuando el usuario complete
> la Task 2, ese SUMMARY se escribe entonces e incorpora esta evidencia.

Base de comparación para todos los diffs: `e773f7c` (último commit antes de ejecutar
la fase).

---

## Gate 1 — Suite completa (`npm test`)

```
 Test Files  19 passed (19)
      Tests  465 passed (465)
```

Baseline antes de la fase: 17 ficheros / 374 tests. Delta: **+2 ficheros, +91 tests**.

## Gate 2 — Build de producción (`npm run build`)

Exit 0. `✨ Build complete!`

## Gate 3 — Generación estática (`npm run generate`)

Exit 0. `✨ You can now deploy .output/public to any static hosting!`

## Gate 4 — Diff del contenido (D-02, y el criterio que la Fase 8 heredará)

```
$ git diff -U0 e773f7c -- content/marvel-champions.json | grep -c '^+[^+]'
1
$ git diff -U0 e773f7c -- content/marvel-champions.json | grep '^+[^+]'
+              "selection": "characters",
$ git diff e773f7c -- content/marvel-champions.json | grep -Ec '^[-+].*"(text|speech)"'
0
```

**Exactamente una línea añadida, cero líneas de `text` o `speech` tocadas.** Es el
criterio duro de D-02 y el mismo que el criterio nº 4 de la Fase 8 exigirá.

## Gate 5 — Deriva de voz y recuento de clips

```
$ npx vitest run --project engine engine/__tests__/voice-drift.test.ts
 Test Files  1 passed (1)
      Tests  8 passed (8)

$ node -e "...Object.keys(m.entries).length"
35

$ git status --porcelain public/audio scripts/voice
(vacío)
```

El gate no pide regenerar ni un clip. **35 clips** (no 37: ver la corrección en
`06-CONTEXT.md` §Phase Boundary).

## Gate 6 — Catálogo y alias dentro del bundle (CAT-06, sin red)

```
$ grep -rl "captain-marvel" .output/public/_nuxt/ | head -3
.output/public/_nuxt/n1gpxWTo.js
$ grep -rl "Bruja Escarlata" .output/public/_nuxt/ | head -3
.output/public/_nuxt/n1gpxWTo.js
```

Tanto el catálogo como el mapa de alias en español viajan dentro del mismo chunk JS
generado. `app/composables/useCharacterCatalogue.ts:11` lo trae por **import estático**
(`import marvelCharacters from '~~/content/marvel-characters.json'`), no por `fetch` —
que es exactamente el patrón de `useGameContent.ts` y lo que hace que funcione sin red.

## Gate 7 — Invariantes de la app

| Comprobación | Resultado |
|---|---|
| `grep -rn "v-html" app/` | vacío ✓ (T-01-01) |
| `grep -rn "setup.heroes.01" app/` | vacío ✓ (D-02/TECH-04: el id no está cableado) |
| `grep -rn "from 'zod'" app/` | vacío ✓ (T-01-19) |
| `git diff --name-only e773f7c -- engine/persistence.ts app/composables/usePersistedSession.ts app/composables/useStepShortcuts.ts` | vacío ✓ (D-19 / D-Q2) |
| `grep -n "formatVersion !== 1" engine/persistence.ts` | `74:  if (persisted.formatVersion !== 1) {` ✓ sin bump |
| `grep -c '"contentVersion": 13' content/marvel-champions.json` | `1` ✓ sigue en 13 |

## Gate 8 — Sin dependencias ni entornos de test nuevos

```
$ git diff --name-only e773f7c -- package.json package-lock.json vitest.config.ts
(vacío)
```

Cero cambios en dependencias y cero cambios en la configuración de Vitest.

**Nota sobre un falso positivo:** `grep -rn "jsdom\|happy-dom\|@vue/test-utils"` sí
devuelve dos líneas de `vitest.config.ts`, pero ambas son **comentarios que explican
por qué NO se usa jsdom** (`environment: 'node', // engine/ never touches the DOM — no
jsdom cost`). Ninguna es una dependencia ni un entorno. El diff vacío de arriba es la
prueba real. Este mismo patrón de falso positivo —una cadena prohibida apareciendo
dentro del comentario que explica su prohibición— apareció en los cuatro SUMMARYs de
la fase; conviene tenerlo en cuenta al escribir criterios de aceptación basados en
`grep` en fases futuras.

---

## Veredicto

Los ocho gates pasan. Queda demostrado por diff que **ni el texto de los pasos, ni la
voz, ni la persistencia, ni las dependencias** se han tocado, y que el catálogo y los
alias viajan en el bundle sin red.

Lo que estos gates **no** pueden demostrar, y por eso existe la Task 2: que las tres
superficies nuevas se vean y se toquen bien. No hay entorno de test de componentes en
este proyecto (decisión deliberada, ver `06-RESEARCH.md` Q7), así que los dos `.vue`
nuevos no tienen ni un test automatizado — igual que `StepScreen.vue` y
`WarningDetailModal.vue` hoy.
