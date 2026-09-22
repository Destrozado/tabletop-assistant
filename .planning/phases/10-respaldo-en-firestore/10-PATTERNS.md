# Fase 10: Respaldo en Firestore - Mapa de Patrones

**Mapeado:** 2026-09-22
**Ficheros analizados:** 9 (creación/modificación)
**Analogs encontrados:** 7 / 9

## Clasificación de Ficheros

| Fichero nuevo/modificado | Rol | Flujo de datos | Analog más cercano | Calidad del match |
|---|---|---|---|---|
| `app/composables/useHistorySync.ts` (NUEVO) | service/composable | event-driven + fire-and-forget request-response | `app/composables/usePersistedSession.ts` (seam de storage) + `app/pages/[game]/index.vue` (idioma fire-and-forget) | role-match (compuesto, no existe hoy un composable que hable con un servicio externo) |
| `engine/sync.ts` (NUEVO, recomendado) | utility / transform puro | transform (proyección lista blanca) | `scripts/catalogue/fetch-marvelcdb.mjs` (`extractHero`) + `app/composables/useGameHistory.ts` (`buildHistoryCardView`) | exact (mismo patrón: función pura, campo a campo, sin spread) |
| `app/composables/useGameHistory.ts` (MODIFICADO — `record()`) | composable/controlador de dominio | CRUD (escritura local) + trigger event-driven | el propio fichero, función `record()` (líneas 275-286) | exact (es edición in-place, no una copia nueva) |
| `app/composables/usePersistedSession.ts` (MODIFICADO — nueva clave `tga:history:synced`) | service / storage seam | CRUD sobre localStorage | el propio fichero: `VOICE_KEY`/`loadVoicePreference`/`saveVoicePreference` (colapsable) y `HISTORY_KEY`/`readEnvelope`/`appendHistoryEntry` (no colapsable) | exact (misma costura, dos idiomas ya presentes para elegir) |
| `nuxt.config.ts` (MODIFICADO — `runtimeConfig.public`) | config | N/A | ninguna sección análoga existe hoy (`runtimeConfig` no existe en el fichero) | sin analog directo — usar RESEARCH.md Patrón 4 |
| `package.json` (MODIFICADO — dependencia `firebase`) | config | N/A | dependencias existentes (`@vueuse/core`, etc.) | role-match (adición de dependencia estándar) |
| `firestore.rules` (NUEVO) | config / seguridad | request-response validado en servidor | sin analog en el repo (primer fichero de reglas del proyecto) | sin analog — usar RESEARCH.md Code Examples (bloque completo ya redactado) |
| `.env.example` (NUEVO) | config | N/A | sin analog (primer `.env*` del proyecto) | sin analog |
| `e2e/bundle-budget.spec.ts` (NUEVO) | test (e2e) | batch / static-analysis sobre artefacto de build | `e2e/offline-flow.spec.ts` (lectura de `public/audio/` con `node:fs`, patrón de `test.describe`) | role-match (misma disciplina de leer artefactos reales con `node:fs`, distinto objeto de estudio) |
| `e2e/offline-flow.spec.ts` (EXTENDIDO) | test (e2e) | event-driven (`context.setOffline(true)`) | el propio fichero (líneas 1-40 ya leídas) | exact (es extensión in-place) |
| `app/composables/__tests__/useHistorySync.test.ts` (NUEVO, recomendado) | test (unit) | CRUD sobre storage fake / transform puro | `app/composables/__tests__/usePersistedSession.test.ts` (`createFakeLocalStorage`) | exact |

## Asignaciones de Patrón

### `app/composables/useHistorySync.ts` (NUEVO — composable/service, event-driven)

**Analogs:** `app/composables/usePersistedSession.ts` (guarda SSR + disciplina de comentarios) y `app/pages/[game]/index.vue` (idioma dispara-y-olvida).

**Guarda SSR — copiar literalmente el idioma ya establecido** (`usePersistedSession.ts`, función `readRaw`, líneas 169-183):
```typescript
function readRaw(key: string): RawRead {
  if (typeof window === 'undefined') return { kind: 'unreadable' }
  try {
    const value = window.localStorage.getItem(key)
    if (value === null) return { kind: 'absent' }
    return { kind: 'value', raw: value }
  }
  catch {
    return { kind: 'unreadable' }
  }
}
```
El módulo nuevo copia el `typeof window === 'undefined'` como primera línea del cuerpo (RESEARCH.md Patrón 1 confirma que el sufijo `.client.ts` NO da ninguna garantía real para `app/composables/` — la guarda tiene que ser código, igual que aquí).

**Idioma dispara-y-olvida — copiar literalmente** (`app/pages/[game]/index.vue`, líneas 254-256):
```typescript
// D-09: dispara-y-olvida a propósito, SIN await — no puede retrasar ni la
// aparición del primer paso ni el botón SIGUIENTE. Cualquier fallo (red,
// caché, id ausente) se resuelve en silencio dentro de prefetchAll (D-07).
prefetchAll(audioIds.value).catch(() => {})
```
El mismo idioma (`.catch(() => {})`, comentario explicando por qué el silencio es deliberado) es lo que D-05/D-06/D-07 piden para la llamada que sale de `record()` hacia `useHistorySync().flush(...)`.

**Import dinámico + guarda de config (RESEARCH.md Patrón 1, ya verificado en este repo, cítese tal cual):**
```typescript
export function useHistorySync() {
  function flush(entryIds: string[]): void {
    if (typeof window === 'undefined') return
    const config = useRuntimeConfig().public
    if (!config.firebaseProjectId) return
    void syncPending(entryIds, config).catch(() => {})
  }
  return { flush }
}
```

**No hay analog en el repo para "hablar con un servicio externo desde el cliente"** — este proyecto no tenía hasta ahora ninguna llamada de red saliente del propio cliente en producción (MarvelCDB se llama solo desde un script de build-time, nunca desde el navegador). Es la pieza más nueva de la fase; seguir RESEARCH.md Patrones 1-3 como fuente primaria, no un analog de este repo.

---

### `engine/sync.ts` (NUEVO, recomendado — utility puro, transform)

**Analog:** `scripts/catalogue/fetch-marvelcdb.mjs`, función `extractHero` (líneas 192-235) — proyección de lista blanca campo a campo, nunca spread.

**Patrón a copiar** (la forma, no el contenido — es CLI/Node, esto es motor cliente):
```javascript
// scripts/catalogue/fetch-marvelcdb.mjs:231-238 — RETORNO explícito campo a
// campo, nunca `return card` ni `{ ...card, algo }`.
return {
  id: slugify(card.name),
  name: card.name,
  alterEgo: card.linked_card.name,
  health,
  handSizeHero,
  handSizeAlterEgo,
}
```

**Segundo analog, más cercano en shape (composable Vue, función pura sin Vue):** `app/composables/useGameHistory.ts`, `buildHistoryCardView` (línea 100-103) — "función PURA, sin Vue, calcada del patrón de [motor]". Mismo espíritu que D-09 pide para `buildSyncPayload(entry: GameHistoryEntry): FirestoreHistoryPayload`: función pura, sin importar Vue ni Firebase, testeable en Vitest sin ningún doble de prueba de red. Ver RESEARCH.md Patrón 3 para la firma completa ya redactada (`engine/sync.ts`, `buildSyncPayload`).

**Comentario de cabecera a imitar** (mismo tono que `fetch-marvelcdb.mjs` líneas 24-33 sobre por qué la lista blanca existe): documentar explícitamente que la lista de campos es la MISMA que `firestore.rules` valida con `hasOnly()` — si un campo se añade aquí sin añadirse a las reglas, la escritura se rechaza en producción; si se añade a las reglas sin añadirse aquí, no pasa nada pero la regla queda muerta. Este acoplamiento (D-09) debe quedar escrito en el comentario del fichero, igual que `fetch-marvelcdb.mjs` documenta su propio acoplamiento con `content/marvel-characters.json`.

---

### `app/composables/useGameHistory.ts` — `record()` (MODIFICADO in-place)

**Analog:** el propio fichero, función actual (líneas 275-286):
```typescript
function record(session: EngineSession, outcome: GameOutcome): boolean {
  const catalogue = getCatalogue(session.gameId)
  const names = resolveFrozenNames(session.context, catalogue)
  const entry = buildHistoryEntry(session, outcome, Date.now(), names)
  return appendHistoryEntry(entry)
}
```
**Cambio exacto que D-05/D-06 piden:** capturar el `boolean` de `appendHistoryEntry(entry)` en una variable, y si es `true`, llamar `useHistorySync().flush([...pendingIds, entry.id])` (o el id + los ya pendientes leídos de `usePersistedSession`) con el mismo idioma `.catch(() => {})` de arriba, ANTES del `return`. La firma sigue devolviendo `boolean` de forma síncrona — D-05 lo exige explícitamente.

**Cabecera a reescribir (obligatorio, señalado en CONTEXT.md):** el comentario de las líneas 280-285 dice hoy "la firma es totalmente síncrona por diseño (una fase futura es quien podría cambiar esto, no esta)" — esta fase debe sustituirlo por texto que diga que sigue siendo síncrona de cara a su llamador, pero deja de ser libre de efectos (dispara la subida a Firestore).

---

### `app/composables/usePersistedSession.ts` — nueva clave `tga:history:synced` (MODIFICADO in-place)

**Dos analogs, dos idiomas ya presentes en el mismo fichero — el planner elige uno con conocimiento de causa:**

**Idioma A (colapsable, RECONSTRUIBLE) — `loadVoicePreference`** (líneas 362-372):
```typescript
function loadVoicePreference(): boolean {
  const read = readRaw(VOICE_KEY)
  // CR-01 (ronda 3): preferencia RECONSTRUIBLE (se vuelve a pulsar el
  // botón), así que «no sé leer» sigue cayendo al valor por defecto igual
  // que «no hay preferencia guardada».
  if (read.kind !== 'value') return true
  return normalizeVoicePreference(read.raw === 'true')
}
```
CONTEXT.md ya dictamina que `tga:history:synced` **es** reconstruible (D-01: "puede colapsar `unreadable` y `absent` como hacen `load`/`loadVoicePreference`") — así que este es el idioma recomendado por defecto: si la clave de marcas es ilegible, tratarla como lista vacía de sincronizados (todo se reintenta, D-03 hace ese reintento inocuo).

**Idioma B (no colapsable, distingue los tres casos) — `readEnvelope`/`appendHistoryEntry`** (líneas 261-270, 409-429): usado para `tga:history`, que es irreconstruible. Mostrado aquí solo como contraste — NO es el patrón recomendado para `tga:history:synced`, pero el planner debe conocerlo por si decide que la poda perezosa de D-04 necesita distinguir "vacío" de "ilegible" antes de escribir.

**Declaración de la clave** (mismo patrón que `VOICE_KEY`/`HISTORY_KEY`, líneas 45 y 53):
```typescript
const VOICE_KEY = 'tga:voice-enabled'
const HISTORY_KEY = 'tga:history'
// NUEVO: const SYNCED_KEY = 'tga:history:synced'
```

**Lector/escritor nuevos, calcados de `loadVoicePreference`/`saveVoicePreference`** (mismo par de líneas 362-378): un lector que use `readRaw(SYNCED_KEY)` con el idioma A de arriba (parseando el JSON del array de ids), y un escritor `writeRaw(SYNCED_KEY, JSON.stringify(ids))` sin mirar el booleano de retorno (igual que `saveVoicePreference`, porque un fallo aquí solo produce un reintento de más, D-03).

**Export del composable:** añadir las dos funciones nuevas al `return` final (línea 466), mismo patrón que el resto de funciones ya expuestas ahí.

---

### `nuxt.config.ts` — `runtimeConfig.public` (MODIFICADO, sección nueva)

**Sin analog en este repo** (confirmado por RESEARCH.md: "`nuxt.config.ts` no tiene hoy `runtimeConfig` en absoluto"). Usar el fragmento ya verificado en RESEARCH.md Patrón 4:
```typescript
runtimeConfig: {
  public: {
    firebaseApiKey: '',
    firebaseProjectId: '',
    // ...resto de campos del config object de Firebase, todos cadena vacía
  },
},
```
**No tocar** `pwa.registerType`, `pwa.workbox.globPatterns`/`globIgnores` ni ningún `routeRules` existente (CONTEXT.md Integration Point 3 lo prohíbe explícitamente: `firestore.googleapis.com` es cross-origin, fuera de Workbox).

---

### `firestore.rules` (NUEVO) y `.env.example` (NUEVO)

**Sin analog en el repo** (primeros ficheros de su tipo). Usar literalmente el bloque de reglas ya redactado y citado en RESEARCH.md §Code Examples (`rules_version = '2'`, `match /history/{docId}`, `allow create` con `hasOnly()` + tipos + `request.auth.uid`/`request.time`) — es la especificación concreta de D-09/D-11/D-12, no una plantilla a adaptar.

`.env.example` sigue la convención de nombre `NUXT_PUBLIC_FIREBASE_*` documentada en RESEARCH.md Patrón 4 (una línea por campo del `runtimeConfig.public` nuevo, todas vacías, con comentario recordando D-13: "las claves web de Firebase no son un secreto, pero este repo es público").

---

### `e2e/bundle-budget.spec.ts` (NUEVO — test e2e, gate D-16)

**Analog de estructura:** `e2e/offline-flow.spec.ts`, patrón de lectura de artefactos reales con `node:fs` (líneas 12-24):
```typescript
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

const AUDIO_DIR = join(process.cwd(), 'public/audio')
const firstAudioFile = readdirSync(AUDIO_DIR, { withFileTypes: true })
  .find(entry => entry.isFile() && entry.name.endsWith('.m4a'))
  ?.name
```
El nuevo spec sigue el mismo patrón (`node:fs` contra un directorio real, `test.describe`/`test` de Playwright) pero apuntando a `.output/public/**` en vez de `public/audio/`. **Importante (Pitfall 3 de RESEARCH.md):** debe vivir en `e2e/`, nunca en `engine/__tests__/` ni `app/composables/__tests__/` — Vitest no tiene garantizado que `.output/public` exista cuando corre, Playwright sí vía su propio `webServer`. RESEARCH.md ya trae el fichero completo redactado y verificado contra un `nuxt generate` real de este repo (§Code Examples) — copiarlo, no reinventarlo, y solo ajustar `MAX_INITIAL_JS_BYTES` tras medir el build real de esta fase (Open Question 1 de RESEARCH.md).

---

### `e2e/offline-flow.spec.ts` (EXTENDIDO)

**Analog:** el propio fichero (ya leído, líneas 1-40) — mismo helper `waitForServiceWorkerControl`, mismo `context.setOffline(true)`. La extensión que pide la verificación (a) del ROADMAP añade un `test()` nuevo dentro del `test.describe` existente, reutilizando `waitForServiceWorkerControl` sin duplicarlo.

---

### `app/composables/__tests__/useHistorySync.test.ts` (NUEVO, recomendado)

**Analog:** `app/composables/__tests__/usePersistedSession.test.ts`, `createFakeLocalStorage` (líneas 1-22):
```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function createFakeLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => (store.has(key) ? store.get(key)! : null)),
    setItem: vi.fn((key: string, value: string) => { store.set(key, value) }),
    removeItem: vi.fn((key: string) => { store.delete(key) }),
  }
}
```
Este es el doble de prueba que ya usa el proyecto para la costura de `localStorage` — reutilizarlo tal cual para probar `enqueueForSync`/la lectura de `tga:history:synced`. Para la parte que habla con Firebase (`syncPending`), CONTEXT.md deja a discreción del planner "la forma de probar el composable en Vitest sin tocar Firestore real" — no existe hoy en el repo ningún test que mockee un SDK externo (MarvelCDB se prueba solo en el script de generación, nunca con un doble de red en Vitest), así que esta pieza concreta no tiene analog: seguir el patrón estándar de Vitest (`vi.mock('firebase/firestore', ...)`) sin un precedente propio del repo que copiar.

## Patrones Compartidos

### Guarda SSR a mano
**Fuente:** `app/composables/usePersistedSession.ts:169-183` (`readRaw`)
**Aplica a:** `useHistorySync.ts` (todo el módulo), cualquier función que toque `window`/`localStorage` desde el nuevo composable.
```typescript
if (typeof window === 'undefined') return /* valor seguro por defecto */
```

### Dispara-y-olvida (`.catch(() => {})`)
**Fuente:** `app/pages/[game]/index.vue:256,554,796` (`prefetchAll(...).catch(() => {})`)
**Aplica a:** la llamada que sale de `record()`, y el `setDoc(...).catch(() => {})` dentro de `syncPending`.

### Proyección por lista blanca, nunca spread
**Fuente:** `scripts/catalogue/fetch-marvelcdb.mjs:231-238` (`extractHero`)
**Aplica a:** `engine/sync.ts` (`buildSyncPayload`) — mismo principio, D-09 lo cita expresamente como precedente.

### Función pura, sin Vue, testeada directamente
**Fuente:** `app/composables/useGameHistory.ts:100-103` (`buildHistoryCardView`)
**Aplica a:** `engine/sync.ts` (`buildSyncPayload`) — mismo shape estructural (entrada tipada del motor → vista/proyección tipada de salida).

### Tres resultados de lectura de storage (`absent`/`value`/`unreadable`) y su colapso deliberado
**Fuente:** `app/composables/usePersistedSession.ts:162-183` (`RawRead`) y `362-372` (`loadVoicePreference`, colapso a valor por defecto)
**Aplica a:** el lector de `tga:history:synced` — D-01 ya dictamina qué idioma usar (el colapsable, no el de `tga:history`).

## Sin Analog Encontrado

| Fichero | Rol | Flujo de datos | Razón |
|---|---|---|---|
| `nuxt.config.ts` (`runtimeConfig.public`) | config | N/A | Primera sección `runtimeConfig` del proyecto — usar RESEARCH.md Patrón 4 tal cual, ya verificado contra `nuxt generate` real. |
| `firestore.rules` | config/seguridad | request-response validado en servidor | Primer fichero de reglas del proyecto — usar el bloque completo ya redactado en RESEARCH.md §Code Examples. |
| `.env.example` | config | N/A | Primer `.env*` del proyecto — seguir convención `NUXT_PUBLIC_FIREBASE_*` de RESEARCH.md Patrón 4. |
| `firebase.json` / `.firebaserc` (mencionados en RESEARCH.md, no en CONTEXT.md pero necesarios para D-15) | config | N/A | Primeros ficheros de su tipo — usar los mínimos ya redactados en RESEARCH.md §Code Examples. |
| Parte de `useHistorySync.ts` que habla con Firebase (`syncPending`, auth anónima) | service | event-driven / request-response con SDK externo | Primera llamada de red saliente del cliente en producción de este proyecto — no hay analog de "composable que llama a un servicio externo"; seguir RESEARCH.md Patrones 1-3 (ya verificados/citados) como fuente primaria. |

## Metadatos

**Alcance de búsqueda de analogs:** `app/composables/`, `app/composables/__tests__/`, `app/pages/[game]/index.vue`, `scripts/catalogue/`, `e2e/`, `nuxt.config.ts`, `package.json`.
**Ficheros escaneados:** 9 (todos leídos directamente, sin Glob/Grep adicional — el conjunto de analogs candidatos ya venía acotado por CONTEXT.md/RESEARCH.md).
**Fecha de extracción de patrones:** 2026-09-22
