# Fase 10: Respaldo en Firestore - Investigación

**Investigado:** 2026-09-22
**Dominio:** SDK modular de Firebase (Auth anónima + Firestore) cargado de forma diferida en una PWA Nuxt 4 SSG ya en producción; reglas de seguridad `create`-only; gate de CI sobre el bundle prerenderizado.
**Confianza:** ALTA en los hechos verificables por lectura directa de este repo y por ejecución real de `nuxt generate` en este mismo entorno; MEDIA en el comportamiento del SDK de Firebase (contrastado contra documentación oficial y código fuente de terceros vía WebSearch/WebFetch, no ejercitado contra un proyecto Firebase real en esta sesión); las dos correcciones a `research/ARCHITECTURE.md` y `research/PITFALLS.md` que exige el encargo quedan marcadas explícitamente donde corresponde.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Numeración local de la fase (D-01..D-16). Todas vienen ya cerradas por
`10-CONTEXT.md` — este documento las investiga, no las reabre.

- **D-01:** la marca de sincronizado vive en una clave aparte de localStorage,
  `tga:history:synced`, con los ids ya subidos — nunca como campo dentro de la
  entrada. Descarta expresamente la recomendación de `research/ARCHITECTURE.md:217`
  (superada por los cierres CR-01/CR-03 de la Fase 9).
- **D-02:** el flush se dispara en dos momentos — al registrar una partida
  (arrastrando las pendientes) y al evento `online`. Nada se dispara en el
  arranque de la app ni al cargar una ruta.
- **D-03:** `setDoc(doc(col, entry.id), …)` — el id local ES el id del
  documento. Un reintento de algo que el servidor ya tenía se rechaza con
  `permission-denied` y queda pendiente para siempre; no se debe tratar
  `permission-denied` como éxito.
- **D-04:** poda perezosa de la lista de marcas dentro del propio flush,
  descartando ids que ya no estén en `tga:history`. `removeHistoryEntry` no se
  toca. Borrar en local NO borra en Firestore (deliberado).
- **D-05:** la llamada dispara-y-olvida sale de `record()`
  (`app/composables/useGameHistory.ts:286`), justo después de que
  `appendHistoryEntry` devuelva `true`. `record()` sigue síncrona de cara a su
  llamador; el orden D-U4 de `onOutcomeRecorded` no cambia.
- **D-06:** si `record()` devuelve `false` (guardado local fallido), no se
  sube nada.
- **D-07:** invisible del todo — ninguna pantalla menciona la nube.
- **D-08:** el atraso inicial se sube de golpe, sin tope por ráfaga.
- **D-09:** sube una proyección con lista blanca explícita, campo a campo —
  mismo patrón que `scripts/catalogue/fetch-marvelcdb.mjs`. Los `playerName`
  SÍ suben. Nunca `setDoc(ref, entry)` completo.
- **D-10:** colección plana `history/{id}`, con `uid` como campo del
  documento — nunca `users/{uid}/history/{id}`.
- **D-11:** las reglas permiten `create` y nada más — ni `read`, ni `update`,
  ni `delete`. Resuelve a favor de SYNC-07 el conflicto con
  `research/PITFALLS.md:104` (que recomienda `allow read: if true`, superado
  porque STAT-04 ya cerró las estadísticas leyendo solo localStorage). Las
  reglas validan además la FORMA del documento.
- **D-12:** el cliente añade `uid` y `createdAt` (`serverTimestamp()`),
  validado con `request.resource.data.createdAt == request.time`.
- **D-13:** la config de Firebase vive en `runtimeConfig.public`, alimentada
  por variables de entorno en Vercel. Guarda obligatoria: `projectId` vacío ⇒
  no-op ANTES del `import()` dinámico.
- **D-14:** un solo proyecto Firebase; en local (`.env` vacío) la sync es
  no-op siempre. Sin proyecto de desarrollo aparte, sin emulador.
- **D-15:** `firestore.rules` vive committeado y se despliega A MANO con
  `firebase deploy --only firestore:rules`, usando `firebase-tools` como
  herramienta puntual — NUNCA como dependencia del proyecto.
- **D-16:** gate automatizado en CI para el criterio de éxito 3 — falla si
  `firebase` aparece en los chunks iniciales de `/` y `/marvel-champions`, o
  si su tamaño crece por encima de un techo.

### Claude's Discretion

- Nombre/ubicación exacta del composable de sincronización — **verificar
  antes** si el sufijo `.client.ts` se comporta como se espera para un
  composable en Nuxt 4 (ver hallazgo abajo: NO lo hace).
- Dónde se registra/limpia el listener `online` de D-02.
- Nombre exacto de la clave de marcas — se asume `tga:history:synced`.
- Cómo probar el composable en Vitest sin tocar Firestore real.
- Si un fallo deja rastro diagnosticable en consola solo en desarrollo, o
  silencio absoluto también ahí.
- Comportamiento exacto si la auth anónima está deshabilitada en la consola —
  se asume que cae en el mismo camino que cualquier otro fallo.

### Deferred Ideas (OUT OF SCOPE)

- Restaurar el histórico desde Firestore.
- Indicio de pendiente en `/historico` o contador en `/estadisticas`.
- Versión de la app como metadato del documento.
- Emulador de Firestore y tests automatizados de las reglas.
- App Check.
- Leer de Firestore desde cualquier pantalla, cuentas de usuario reales,
  App Check, backoff exponencial, colas persistentes, telemetría.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Descripción | Soporte de esta investigación |
|----|-------------|-------------------------------|
| SYNC-01 | Cada partida registrada se sube a Firestore como respaldo duradero | `setDoc(doc(collection(db,'history'), entry.id), payload)` con `payload` construido por lista blanca (D-09) — ver Code Examples |
| SYNC-02 | Subida «dispara y olvida», nunca `await` en fin de partida | Confirmado (MEDIA, cruzado con GitHub issues + docs oficiales): la promesa de `setDoc` solo resuelve con el ACK del servidor; patrón `.catch(() => {})` ya establecido en `index.vue:256/554/796` |
| SYNC-03 | Marca de sincronizado; pendientes se reintentan al volver la red | `tga:history:synced` (D-01) + listener `online` (D-02) — ver Architecture Patterns |
| SYNC-04 | Sin conexión, todo el resto sigue funcionando igual | Config guard (D-13) + fire-and-forget (D-05) + ninguna pantalla lee Firestore (D-11 sin `read`) |
| SYNC-05 | SDK diferido, solo cliente, fuera de arranque/prerender/primer pintado | Import dinámico dentro del cuerpo de la función + gate D-16 verificado en este repo con `nuxt generate` real — ver Code Examples y Package Legitimacy Audit |
| SYNC-06 | Auth anónima, sin cuentas | `signInAnonymously` + guarda contra doble-alta (ver Pitfall nuevo: "race de auth anónima") |
| SYNC-07 | Reglas: crear sí, leer/borrar los de otros no; campos limitados | `firestore.rules` concreto en Code Examples (D-11/D-09/D-12) |
| SYNC-08 | Un fallo de Firestore nunca bloquea jugar/registrar/estadísticas | Mismo mecanismo que SYNC-04; verificado además que un `setDoc` rechazado nunca lanza fuera de su propio `.catch()` |
| SYNC-09 | Sin persistencia IndexedDB propia de Firestore; cola propia en localStorage | Confirmado: NO llamar `initializeFirestore(..., {localCache: persistentLocalCache(...)})` deja el caché de Firestore en memoria por defecto — ver Assumption A4 sobre el matiz de Auth/IndexedDB |
| COMP-03 | PWA instalada recibe la actualización por `registerType: 'prompt'`, sin recarga forzada | Confirmado por lectura directa: `nuxt.config.ts:103`, `globPatterns`/`globIgnores` (líneas 151-174) — esta fase no los toca |
</phase_requirements>

## Resumen

Esta fase no introduce ningún subsistema nuevo de verdad: añade una única llamada dispara-y-olvida al final de `record()`, una clave nueva de localStorage para la cola de reintento, un fichero de reglas committeado, y una config de runtime nueva. La investigación de hito (`ARCHITECTURE.md` §e, `PITFALLS.md` §2/5/6/7/8/14, `SUMMARY.md`) ya resolvió el diseño de fondo; lo que faltaba —y es el contenido real de este documento— eran seis verificaciones concretas que el `10-CONTEXT.md` dejó explícitamente a discreción del planner, más dos correcciones a la investigación de hito que quedan superadas por decisiones de fase ya tomadas (D-01 sobre `ARCHITECTURE.md:217`, D-11 sobre `PITFALLS.md:104` — ambas ya señaladas en `10-CONTEXT.md` y confirmadas aquí, no se repiten con más detalle del necesario).

**El hallazgo más importante de esta investigación, verificado contra la documentación oficial de Nuxt 4 leída en esta sesión: el sufijo `.client.ts` NO está documentado para ficheros de `app/composables/` — solo para `app/plugins/` y componentes.** `useHistorySync.client.ts` seguiría auto-importándose exactamente igual que cualquier otro composable (Nuxt resuelve por el nombre de la exportación, no por el sufijo del fichero), así que el sufijo no aporta ninguna garantía real de "nunca se ejecuta en el servidor" — solo una etiqueta que puede inducir a error a quien la lea después. La guarda real tiene que ser código, no un nombre de fichero: un `typeof window === 'undefined'` al principio del cuerpo de la función (el mismo idioma ya establecido en `usePersistedSession.ts`), o el equivalente idiomático de Nuxt `import.meta.client`/`import.meta.server` (documentado, inyectado estáticamente, apto para tree-shaking). Cualquiera de los dos es válido; lo que no es válido es apoyarse solo en el nombre del fichero.

**Segundo hallazgo con impacto directo en el diseño: la auth anónima de Firebase tiene una condición de carrera real si `signInAnonymously()` se llama sin comprobar antes si ya existe una sesión anónima persistida.** La restauración de la sesión desde el almacenamiento persistido de Firebase Auth es asíncrona; leer `auth.currentUser` de forma síncrona justo después de `getAuth()` puede devolver `null` aunque exista una sesión anónima previa, y llamar a `signInAnonymously()` en ese momento crea un SEGUNDO usuario anónimo distinto. El patrón correcto y documentado es esperar una vez a `onAuthStateChanged` antes de decidir si hace falta un alta nueva.

**Tercer hallazgo, verificado ejecutando `nuxt generate` de verdad en este repo (no una suposición sobre cómo debería comportarse Vite/Nitro):** las dos rutas del criterio de éxito 3 (`/` y `/marvel-champions`) tienen cada una su propio `index.html` bajo `.output/public/`, cada uno referencia un conjunto de chunks `_nuxt/*.js`/`*.css` mediante un patrón de texto simple y estable, y HOY ninguno de esos chunks contiene la cadena `firebase` — esto da al gate de D-16 una forma concreta, ejecutable y verificada, no una receta hipotética. El "precedente" que el encargo pedía extender (el presupuesto de precacheo de audio de la Fase 4) resultó ser, tras leer el `SUMMARY.md` real de esa fase, una auditoría MANUAL (grep contra `.output/public/sw.js` documentado en el SUMMARY, nunca un test automatizado en el repo) — así que D-16 no tiene en realidad un gate de CI automatizado que copiar; el diseño concreto que se propone más abajo es nuevo, no una extensión de un test ya existente.

**Recomendación principal:** SDK modular `firebase@^12.19.0` (bare, `firebase/app` + `firebase/auth` + `firebase/firestore`, nunca `firestore/lite`), importado dinámicamente dentro de un módulo cuyo nombre NO prometa una garantía de sufijo que Nuxt no da; guarda `typeof window === 'undefined'` explícita; `signInAnonymously` protegido con `onAuthStateChanged`; reglas `create`-only con `hasOnly()` + comprobación de tipos por campo; `firebase-tools` invocado con `npx` puntualmente, nunca instalado como dependencia; gate de CI nuevo (Playwright, no Vitest — justificado abajo) que lee `.output/public` de verdad tras `nuxt generate`.

## Architectural Responsibility Map

| Capacidad | Nivel primario | Nivel secundario | Motivo |
|-----------|---------------|-------------------|--------|
| Registro de partida (fuente de verdad) | Browser / Client (`localStorage`) | — | Ya decidido en Fase 9; esta fase no lo toca |
| Respaldo write-only a la nube | Browser / Client (SDK Firebase cargado en cliente) | Database / Storage (Firestore, gestionado por Google) | El navegador es quien decide CUÁNDO escribir (fire-and-forget); Firestore es un almacén externo puro, sin lógica de servidor propia |
| Autenticación anónima | Browser / Client | — | `signInAnonymously` corre en el cliente; no hay backend propio que lo intermedie |
| Validación de forma del documento | Database / Storage (reglas de Firestore, evaluadas por Google, no por el navegador) | — | Deliberado: la única barrera de seguridad real vive fuera del cliente, precisamente porque el cliente es intrínsecamente no confiable (repo público, sin auth real) |
| Config de proyecto Firebase | Frontend Server (build time, `nuxt generate`) → Browser / Client (bundle ya prerenderizado) | — | `runtimeConfig.public` se resuelve en BUILD, no hay servidor en runtime (SSG puro) — ver hallazgo de Vercel/runtimeConfig abajo |
| Gate de tamaño/contenido del bundle inicial | CDN / Static (analiza el artefacto de build, `.output/public`) | — | Corre en CI contra el resultado de `nuxt generate`, nunca contra código en ejecución |

## Standard Stack

### Core

| Librería | Versión | Propósito | Por qué es la estándar |
|----------|---------|-----------|--------------------------|
| `firebase` | `^12.19.0` [ASSUMED — nombre de paquete conocido por investigación previa del hito, no descubierto de nuevo en esta sesión; versión confirmada `[VERIFIED: npm registry — npm view firebase version, ejecutado en esta sesión, 2026-09-22]` pero el paquete en sí queda SUS por el gate de legitimidad, ver Package Legitimacy Audit] | SDK modular bare: `firebase/app`, `firebase/auth`, `firebase/firestore` | Ya decidido en `research/SUMMARY.md` (bare SDK sobre `vuefire`/`nuxt-vuefire`, que exigirían SSR/`firebase-admin` para lo que este SSG no tiene); la investigación de hito descarta expresamente `@nuxtjs/firebase` (abandonado desde 2022) y `firestore/lite` (sin cola de mutaciones, mataría el sentido de elegir Firestore) |
| Firestore Security Rules | `rules_version = '2'` | Barrera de seguridad real (D-11) | Sintaxis confirmada `[CITED: firebase.google.com/docs/firestore/security/rules-conditions, firebase.google.com/docs/firestore/security/rules-fields]` — `hasOnly()`, comprobación de tipos por campo, `request.auth.uid`, `request.time` |

### Supporting

| Librería | Versión | Propósito | Cuándo usarla |
|----------|---------|-----------|---------------|
| `firebase-tools` | `15.30.2` `[VERIFIED: npm registry — npm view firebase-tools version, 2026-09-22]` (pero **nunca instalado**, D-15) | Despliegue puntual de `firestore.rules` vía `npx firebase-tools@15.30.2 deploy --only firestore:rules` | Solo cuando el fichero de reglas cambia; nunca en `package.json` |

### Alternatives Considered

| En vez de | Podría usarse | Cuándo tendría sentido la alternativa |
|-----------|----------------|-----------------------------------------|
| SDK bare (`firebase/*`) | `vuefire`/`nuxt-vuefire` | Si la app tuviera SSR real y quisiera bindings reactivos de Firestore — no aplica: es SSG puro y Firestore es write-only |
| Reglas desplegadas a mano | Firestore Emulator + tests automatizados de reglas | Si el equipo quisiera reglas verificadas en CI de verdad — descartado explícitamente en D-14 por sumar una herramienta más a un proyecto que hoy se prueba entero con Vitest/Playwright |
| Gate de CI nuevo (Playwright) | Vitest con paso de build previo en CI | Ver razonamiento en Architecture Patterns — Vitest exigiría reordenar el workflow de CI; Playwright ya construye con `nuxt generate` en su propio `webServer` |

**Instalación:**
```bash
npm install firebase@^12.19.0
# firebase-tools NUNCA se instala (D-15) — se invoca puntualmente:
npx firebase-tools@15.30.2 deploy --only firestore:rules
```

**Verificación de versión — ejecutada en esta sesión (2026-09-22):**
```
$ npm view firebase version        →  12.19.0   (publicado 2026-09-11)
$ npm view firebase-tools version  →  15.30.2   (publicado 2026-09-17)
```

## Package Legitimacy Audit

Ejecutado con el gate `gsd_run query package-legitimacy check --ecosystem npm firebase firebase-tools` en esta sesión.

| Paquete | Registro | Antigüedad de la versión publicada | Descargas semanales | Repo fuente | Veredicto | Disposición |
|---------|----------|--------------------------------------|----------------------|-------------|-----------|-------------|
| `firebase` | npm | publicado 2026-09-11 (11 días antes de esta investigación) | 7.390.000/semana | `github.com/firebase/firebase-js-sdk` | **SUS** (razón: `too-new`) | Mantenido, pero marcado — ver nota abajo |
| `firebase-tools` | npm | publicado 2026-09-17 (5 días antes) | 2.149.486/semana | `github.com/firebase/firebase-tools` | **SUS** (razón: `too-new`) | Mantenido — no se instala como dependencia (D-15) |

**Nota de interpretación (no una excepción al protocolo, una explicación de por qué el veredicto es previsible aquí):** el heurístico `too-new` se dispara por la FECHA DE PUBLICACIÓN de la versión más reciente, no por señales de typosquatting — `firebase` publica versiones nuevas con cadencia semanal/quincenal (es el propio SDK first-party de Google/Firebase, repo oficial confirmado, 7,4M descargas/semana). Es exactamente la forma que tomaría un falso positivo de este heurístico contra un paquete legítimo de alta cadencia de releases. Dicho esto, **el protocolo se aplica tal cual está escrito**: veredicto `SUS` → se mantiene la recomendación, pero el planner debe insertar un `checkpoint:human-verify` antes de la tarea que ejecuta `npm install firebase`, y la entrada correspondiente en `package.json` debe leerse una vez más contra `https://www.npmjs.com/package/firebase` antes de fijar la versión definitiva en el lockfile.

**Paquetes retirados por veredicto `SLOP`:** ninguno.
**Paquetes señalados como sospechosos `[SUS]`:** `firebase`, `firebase-tools` — checkpoint humano obligatorio antes de instalar/invocar, con la nota de interpretación de arriba como contexto, no como excusa para saltárselo.

**Scripts `postinstall` sospechosos (Node.js):** no comprobado en esta sesión (`npm view firebase scripts.postinstall` no se ejecutó); el gate de legitimidad no reportó ninguno como señal (`postinstall: null` en ambos paquetes) — el planner debe repetir `npm view firebase scripts.postinstall` justo antes de instalar, como parte del mismo checkpoint humano, no confiar solo en esta lectura.

## Architecture Patterns

### Diagrama de arquitectura del sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│  Navegador (tablet, offline-first)                                  │
│                                                                       │
│  onOutcomeRecorded()  ──▶  record(session, outcome)                 │
│  (index.vue:696)            (useGameHistory.ts:286)                 │
│                                  │                                   │
│                                  ├─▶ buildHistoryEntry() [PURO]      │
│                                  ├─▶ appendHistoryEntry() ──▶ tga:history (localStorage, fuente de verdad)
│                                  │        │ true                     │
│                                  │        ▼                         │
│                                  └─▶ enqueueForSync(entry.id)  ──▶ tga:history:synced (localStorage, cola)
│                                           │                          │
│                                           ▼ (fire-and-forget, .catch(()=>{}))
│                                  ┌────────────────────┐              │
│                                  │ useHistorySync.ts   │              │
│                                  │ (guarda: window,    │              │
│                                  │  guarda: projectId) │              │
│                                  └────────┬───────────┘              │
│                                           │ import() dinámico        │
│                                           ▼                          │
│                              firebase/app, firebase/auth,            │
│                              firebase/firestore (chunk separado,      │
│                              NUNCA en el bundle inicial de / ni       │
│                              /marvel-champions — gate D-16)           │
│                                           │                          │
│  evento `online` (window) ───────────────┤ (dispara el mismo flush) │
│                                           │                          │
└───────────────────────────────────────────┼──────────────────────────┘
                                             │  setDoc(doc(col,'history',entry.id), payload)
                                             ▼  [cross-origin, fuera de Workbox/globPatterns]
                                ┌─────────────────────────────┐
                                │ Firestore (firestore.googleapis.com) │
                                │  colección plana `history/{id}`      │
                                │  reglas: create-only + hasOnly() +   │
                                │  tipos por campo + request.time      │
                                │  (evaluadas EN GOOGLE, nunca en el   │
                                │  cliente — la única barrera real)    │
                                └─────────────────────────────┘

                (Ninguna flecha entra desde Firestore hacia la app: write-only,
                 frontera de una sola dirección — D-11 sin `read`, sin `delete`.)
```

### Recommended Project Structure

```
app/composables/
├── useGameHistory.ts          # MODIFICADO: record() llama al sync tras appendHistoryEntry (D-05)
├── usePersistedSession.ts     # MODIFICADO: nueva clave tga:history:synced + lector/escritor (D-01/D-04)
└── useHistorySync.ts          # NUEVO — ver nota sobre el sufijo .client.ts más abajo

engine/
└── sync.ts                    # NUEVO (recomendado, opcional): proyección pura entry→payload (D-09),
                                # testeable sin tocar Firebase — mismo patrón que engine/history.ts

firestore.rules                # NUEVO, raíz del repo (D-15)
firebase.json                  # NUEVO, raíz del repo — mínimo, solo firestore.rules
.firebaserc                    # NUEVO, raíz del repo — project id, no es secreto
.env.example                   # NUEVO — nombres de las variables NUXT_PUBLIC_FIREBASE_*

e2e/
├── offline-flow.spec.ts       # EXTENDIDO: verificación (a) del ROADMAP
└── bundle-budget.spec.ts      # NUEVO (recomendado): gate D-16, ver Code Examples
```

### Patrón 1: la guarda `.client.ts` NO existe para composables — usar código, no un sufijo

**Qué:** Nuxt 4 documenta el sufijo `.client`/`.server` para `app/plugins/` y para componentes; la página de directorio de `app/composables/` (leída en esta sesión) no lo menciona en absoluto. Un fichero `useHistorySync.client.ts` se auto-importaría exactamente igual que cualquier otro composable — Nuxt resuelve por el NOMBRE DE LA EXPORTACIÓN, no por el sufijo del fichero, y este repo ya usa siempre exports nombrados (`export function useGameHistory()`, nunca `export default`), así que ni siquiera hay riesgo de que el sufijo rompa el nombre auto-importado — simplemente no aporta ninguna garantía de ejecución.

**Cuándo aplica:** cualquier módulo de esta fase que deba no ejecutarse nunca durante el prerender/SSR.

**Patrón recomendado, verificado:**
```ts
// app/composables/useHistorySync.ts (sin sufijo .client — no aporta nada, y prometer una
// garantía que Nuxt no da a un futuro mantenedor es peor que no prometer nada)
export function useHistorySync() {
  function flush(entryIds: string[]): void {
    // Guarda real: el mismo idioma que usePersistedSession.ts ya usa en toda la app
    // (readRaw/writeRaw, líneas 169-234) — consistencia de estilo, no una novedad.
    if (typeof window === 'undefined') return

    const config = useRuntimeConfig().public
    // D-13: guarda de configuración ANTES del import() dinámico.
    if (!config.firebaseProjectId) return

    // El import() dinámico solo ocurre si las dos guardas de arriba se superan —
    // SYNC-05 se cumple por construcción, no por disciplina del llamador.
    void syncPending(entryIds, config).catch(() => {
      // Fire-and-forget (SYNC-02/D-05): nunca se propaga el error hacia
      // record()/onOutcomeRecorded. Silencio deliberado (D-07).
    })
  }

  return { flush }
}

async function syncPending(entryIds: string[], config: FirebaseRuntimeConfig) {
  const [{ initializeApp, getApps }, { getAuth, signInAnonymously, onAuthStateChanged }, { getFirestore, doc, setDoc, serverTimestamp }] =
    await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')])
  // ... init + auth + setDoc, ver Patrón 2 y Patrón 3
}
```

**Alternativa igualmente válida (idioma nativo de Nuxt en vez del ya establecido en este repo):** sustituir `typeof window === 'undefined'` por `if (import.meta.server) return` — documentado, inyectado estáticamente por Nuxt, apto para tree-shaking `[CITED: nuxt.com/docs/4.x/api/advanced/import-meta]`. Cualquiera de los dos cumple SYNC-05; el planner elige uno y lo aplica de forma consistente en todo el módulo nuevo.

### Patrón 2: auth anónima sin duplicar usuarios — esperar UNA vez a `onAuthStateChanged`

**Qué:** `signInAnonymously()` crea un usuario anónimo NUEVO cada vez que se llama y no hay ya una sesión activa — pero la restauración de una sesión anónima previa desde el almacenamiento persistido de Firebase Auth es asíncrona. Leer `auth.currentUser` de forma síncrona justo tras `getAuth(app)` puede devolver `null` mientras esa restauración sigue en vuelo, y llamar a `signInAnonymously()` en ese instante crea un segundo uid — silenciosamente, sin error, y sin que D-11's reglas (que expresan propiedad por `uid`) lo detecten como nada anómalo.

**Cuándo aplica:** la primera vez que el módulo de sync se ejecuta en cada carga de página (no solo la primera vez en la vida del dispositivo).

**Cómo evitarlo (patrón documentado, confirmado por búsqueda cruzada — `[CITED: firebase.google.com/docs/auth/web/anonymous-auth]`, MEDIA):**
```ts
async function ensureAnonymousUser(auth: Auth): Promise<string> {
  const user = await new Promise<User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      unsubscribe()
      resolve(u)
    })
  })
  if (user) return user.uid
  const credential = await signInAnonymously(auth)
  return credential.user.uid
}
```

**Señales de alarma:** cualquier código que llame a `signInAnonymously(auth)` sin haber esperado antes a `onAuthStateChanged` (o a `auth.currentUser` tras la resolución de `authStateReady()` si el SDK de esta versión lo expone) — el síntoma sería un `uid` distinto en cada recarga de la app pese a que el navegador nunca borra sus datos.

### Patrón 3: escritura idempotente + proyección por lista blanca (D-03/D-09/D-12)

```ts
// engine/sync.ts (recomendado, PURO, testeable en Vitest sin tocar Firebase)
export interface FirestoreHistoryPayload {
  id: string
  gameId: string
  result: 'won' | 'lost'
  lossCause: 'mainSchemeCompleted' | 'heroesEliminated' | null
  villainId: string | null
  villainName: string | null
  players: { heroId: string | null, heroName: string | null, playerName: string }[]
  difficulty: 'normal' | 'expert'
  playerCount: number
  round: number
  durationMs: number | null
  recordedAt: string
}

// D-09: proyección por lista blanca EXPLÍCITA, campo a campo — nunca
// `{ ...entry }`. Los nombres/tipos vienen de engine/types.ts:200-213
// (GameHistoryEntry), leído directamente en esta sesión.
export function buildSyncPayload(entry: GameHistoryEntry): FirestoreHistoryPayload {
  return {
    id: entry.id,
    gameId: entry.gameId,
    result: entry.result,
    lossCause: entry.lossCause,
    villainId: entry.villainId,
    villainName: entry.villainName,
    players: entry.players.map(p => ({ heroId: p.heroId, heroName: p.heroName, playerName: p.playerName })),
    difficulty: entry.difficulty,
    playerCount: entry.playerCount,
    round: entry.round,
    durationMs: entry.durationMs,
    recordedAt: entry.recordedAt,
  }
}
```

```ts
// Dentro de syncPending(), tras resolver auth/firestore (Patrón 1+2):
const uid = await ensureAnonymousUser(auth)
const db = getFirestore(app)
for (const entryId of entryIds) {
  const entry = /* leer de tga:history por id */
  const payload = buildSyncPayload(entry)
  await setDoc(doc(db, 'history', payload.id), {
    ...payload,
    uid,
    createdAt: serverTimestamp(),
  }).catch(() => {
    // D-03: un `permission-denied` (reintento de algo que el servidor ya
    // tenía) o un `unavailable` (sin red) se tratan IGUAL aquí — el id
    // simplemente no se retira de tga:history:synced y se reintenta en el
    // próximo flush. NUNCA marcar como sincronizado dentro de este catch.
  })
  // Solo si la promesa anterior resuelve SIN lanzar se retira el id de la
  // cola de pendientes — eso vive en usePersistedSession.ts, no aquí.
}
```

**Códigos de error reales, confirmados por documentación oficial + issues cruzados (`[CITED]`, MEDIA):** un rechazo por reglas llega como `FirebaseError` con `.code === 'firestore/permission-denied'` (equivalente string corto `'permission-denied'` según el punto de acceso); un fallo de red/servidor caído llega como `'unavailable'`. El código NO necesita distinguirlos para decidir qué hacer (D-03 los trata igual: ambos dejan el id pendiente) — pero si el discretion item de "rastro diagnosticable en consola solo en desarrollo" se implementa, ese es el campo a loguear (`error.code`), nunca el objeto de error completo (podría filtrar detalles internos del SDK a la consola de producción si el guard de entorno fallara).

### Patrón 4: `runtimeConfig.public` en un sitio 100% prerenderizado

**Confirmado (`[CITED: nuxt.com/docs/4.x/guide/going-further/runtime-config]`, ALTA):** para `nuxt generate`, los valores de `runtimeConfig.public` se HORNEAN en el payload en tiempo de BUILD — no hay servidor Nitro sirviendo peticiones en producción que pudiera leer variables de entorno frescas en cada visita. Esto significa, literalmente:

- Las variables `NUXT_PUBLIC_FIREBASE_*` deben existir en Vercel como **Build-time Environment Variables**, no solo como "runtime" (en un sitio 100% estático no hay tal cosa).
- Cambiar el valor de una variable de entorno en Vercel sin disparar un nuevo build/deploy **no tiene ningún efecto** — el sitio servido sigue con el valor horneado en el último `nuxt generate`.
- La convención de nombre (`[CITED]`, misma fuente): una variable de entorno solo sobreescribe `runtimeConfig.public.<key>` si se llama `NUXT_PUBLIC_<KEY_EN_MAYÚSCULAS_CON_GUION_BAJO>`. Para `runtimeConfig.public.firebaseProjectId` la variable es `NUXT_PUBLIC_FIREBASE_PROJECT_ID`.

```ts
// nuxt.config.ts (fragmento nuevo, D-13) — nunca existió runtimeConfig antes de esta fase
runtimeConfig: {
  public: {
    firebaseApiKey: '',
    firebaseProjectId: '',
    // ... resto de campos del config object de Firebase, todos como cadena vacía
    // por defecto: la ausencia de valor es la señal de "sin configurar" que
    // la guarda de useHistorySync.ts (Patrón 1) usa para cortocircuitar.
  },
},
```

## Don't Hand-Roll

| Problema | No construir | Usar en su lugar | Por qué |
|----------|---------------|-------------------|---------|
| Cola de reintento offline | Un motor de sincronización con backoff exponencial, colas persistentes, telemetría | `tga:history:synced` (array de ids) + flush en dos disparadores (D-02) | Explícitamente descartado por el propio ROADMAP — «sofisticación de motor de sincronización para un respaldo de unas pocas decenas de documentos al año» |
| Persistencia offline de Firestore | `persistentLocalCache`/`enableIndexedDbPersistence` | No llamar a ninguna — dejar el caché en memoria por defecto (SYNC-09) | Un segundo almacén IndexedDB conviviendo con el Workbox del service worker, por un volumen de escritura ínfimo |
| Validación de reglas | Firestore Emulator + suite de tests de reglas | Revisión humana del fichero `firestore.rules` committeado, antes de la primera escritura real (D-15, verificación (b) del ROADMAP) | Descartado en D-14: una herramienta y un flujo más en un proyecto que se prueba entero con Vitest/Playwright |
| Gate de bundle | Un analizador de bundle genérico (webpack-bundle-analyzer, etc.) | Lectura directa de `.output/public/*/index.html` + los chunks `_nuxt/*.js` que referencian (patrón ya verificado en esta sesión) | Cero dependencias nuevas, mismo espíritu que el resto del proyecto («fail loudly at build» con herramientas ya presentes) |

**Key insight:** cada "no construir esto" de la tabla de arriba ya estaba decidido en `10-CONTEXT.md`/`ROADMAP.md` antes de esta investigación — el valor añadido aquí es confirmar que la alternativa concreta (clave de localStorage, guarda de código, revisión humana, lectura de `.output/public`) es ejecutable con lo que el repo ya tiene, no una promesa sin verificar.

## Common Pitfalls

> Los pitfalls de dominio general (Firestore/SDK) ya están documentados en `research/PITFALLS.md` §2, §5, §6, §7, §8, §14 y no se repiten aquí salvo para señalar las dos correcciones explícitas que `10-CONTEXT.md` ya hace (`ARCHITECTURE.md:217` superado por D-01; `PITFALLS.md:104` superado por D-11). Lo que sigue son pitfalls NUEVOS, específicos de las verificaciones que esta fase pedía hacer.

### Pitfall 1: confiar en `.client.ts` como si fuera una garantía de Nuxt para composables

**Qué falla:** un desarrollador nombra el fichero `useHistorySync.client.ts` creyendo (razonablemente, por analogía con plugins/componentes) que Nuxt se niega a ejecutarlo en el servidor. No lo hace — es un nombre de fichero cualquiera para un composable. Si el código dentro asume esa protección y omite la guarda `typeof window === 'undefined'`/`import.meta.server`, y algún cambio futuro invoca la factoría del composable (no `record()`, sino `useHistorySync()` en sí) desde el `<script setup>` de un componente que SÍ se prerrenderiza, el cuerpo del composable se ejecuta durante el prerender.
**Por qué pasa:** la convención SÍ existe y SÍ está documentada — solo que para un tipo de fichero distinto (`app/plugins/`), y es fácil generalizar por analogía sin comprobar la página exacta de `app/composables/`.
**Cómo evitarlo:** la guarda de entorno vive en el CUERPO del código, nunca en el nombre del fichero — ver Patrón 1.
**Señales de alarma:** cualquier PR que añada `.client.ts`/`.server.ts` a un fichero de `app/composables/` sin también añadir una guarda explícita dentro.

### Pitfall 2: doble alta de usuario anónimo por no esperar a `onAuthStateChanged`

**Qué falla:** cada recarga de página que ejecuta el flush crea un `uid` nuevo porque `auth.currentUser` se lee antes de que la restauración asíncrona de sesión termine — ver Patrón 2. El síntoma es invisible desde la app (D-11 no permite `read`), así que solo se detectaría mirando la consola de Firebase y viendo N usuarios anónimos por cada dispositivo real que ha usado la app, en vez de 1.
**Por qué pasa:** el ejemplo más común en tutoriales de Firebase Auth es `if (!auth.currentUser) signInAnonymously(auth)` sin el `await onAuthStateChanged` previo — funciona "la mayoría de las veces" en pruebas manuales porque la restauración suele ser rápida, lo que oculta la condición de carrera hasta que se agrega bajo un patrón de uso real (recargas frecuentes, tablet que se autobloquea).
**Cómo evitarlo:** Patrón 2, arriba.
**Señales de alarma:** ningún test automatizado puede cazar esto sin un proyecto Firebase real (está fuera de alcance por D-14) — la señal de alarma real es una revisión de código que busque `signInAnonymously` sin un `onAuthStateChanged`/`authStateReady()` inmediatamente antes.

### Pitfall 3: el gate de D-16 corre en el paso equivocado de CI y siempre pasa en falso o siempre falla

**Qué falla:** `.github/workflows/ci.yml` (leído en esta sesión) ejecuta, en este orden: `npm run typecheck` → `npm run test` (Vitest) → `npx playwright install` → `npx playwright test`. **`.output/public` no existe todavía cuando `npm run test` corre** — solo se genera dentro del `webServer` que `playwright.config.ts` arranca (`npm run generate && npx nuxi preview`, confirmado por lectura directa). Si el gate de D-16 se escribe como un test de Vitest bajo `engine/**/*.test.ts` o `app/**/*.test.ts` (los dos únicos globs que `vitest.config.ts` reconoce, confirmado por lectura directa), **fallará siempre por "fichero no encontrado" en CI**, no por detectar `firebase` en el bundle — un falso negativo que parece un gate funcionando cuando en realidad nunca llegó a comprobar nada.
**Por qué pasa:** el precedente que el encargo pedía extender (presupuesto de precacheo de audio, Fase 4) NO es un test automatizado — es una auditoría manual documentada en `04-04-SUMMARY.md` (grep contra `.output/public/sw.js`, ejecutado a mano y pegado en el resumen del plan). No existe hoy en este repo ningún test que dependa de `.output/public` para pasar.
**Cómo evitarlo:** el gate de D-16 debe vivir en `e2e/` como una spec de Playwright (p. ej. `e2e/bundle-budget.spec.ts`), leyendo `.output/public` con `node:fs` igual que `e2e/offline-flow.spec.ts` ya hace con `AUDIO_DIR` (confirmado, línea 21-24) — así el `webServer` de Playwright garantiza que el build existe antes de que el test se ejecute, sin tocar el orden del workflow de CI.
**Señales de alarma:** un PR que añade un test de "tamaño de bundle" bajo `engine/__tests__/` o `app/composables/__tests__/` en vez de `e2e/`.

## Code Examples

### `firestore.rules` — reglas concretas para D-09/D-11/D-12

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /history/{docId} {
      allow read, update, delete: if false;

      allow create: if
        // D-11: solo forma validada, nunca identidad de verdad (no hay auth real).
        request.resource.data.keys().hasOnly([
          'id', 'gameId', 'result', 'lossCause', 'villainId', 'villainName',
          'players', 'difficulty', 'playerCount', 'round', 'durationMs',
          'recordedAt', 'uid', 'createdAt'
        ]) &&
        request.resource.data.keys().hasAll([
          'id', 'gameId', 'result', 'players', 'difficulty', 'playerCount',
          'round', 'recordedAt', 'uid', 'createdAt'
        ]) &&
        request.resource.data.id is string &&
        request.resource.data.gameId is string &&
        request.resource.data.result in ['won', 'lost'] &&
        (request.resource.data.lossCause == null ||
         request.resource.data.lossCause in ['mainSchemeCompleted', 'heroesEliminated']) &&
        (request.resource.data.villainId == null || request.resource.data.villainId is string) &&
        (request.resource.data.villainName == null || request.resource.data.villainName is string) &&
        request.resource.data.players is list &&
        // Tope de tamaño defensivo — 8 es holgado frente al maxPlayers:4 de
        // Marvel Champions hoy (content/marvel-champions.json:7, leído en
        // esta sesión), con margen para un juego futuro sin tener que
        // redesplegar reglas por ese motivo concreto.
        request.resource.data.players.size() <= 8 &&
        request.resource.data.difficulty in ['normal', 'expert'] &&
        request.resource.data.playerCount is int && request.resource.data.playerCount > 0 &&
        request.resource.data.round is int && request.resource.data.round > 0 &&
        (request.resource.data.durationMs == null || request.resource.data.durationMs is int) &&
        request.resource.data.recordedAt is string &&
        request.resource.data.recordedAt.size() <= 64 &&
        // D-12: identidad expresada en el propio documento, y createdAt SOLO
        // puede ser la hora del servidor — nadie puede antedatar basura.
        request.resource.data.uid == request.auth.uid &&
        request.resource.data.createdAt == request.time;
    }

    // D-11 recuerda: no hay ninguna otra colección — cualquier otro path
    // queda denegado por defecto al no tener ningún `match` que lo cubra.
  }
}
```

**Limitación documentada de las reglas de Firestore, importante para revisar en la verificación humana (b):** `hasOnly()`/comprobación de tipos por campo funciona a nivel de las CLAVES DEL DOCUMENTO, pero NO hay una forma nativa de iterar `players[]` y validar la forma de cada objeto individual dentro de la lista (`[CITED: firebase.google.com/docs/firestore/security/rules-fields]`, confirmado por búsqueda cruzada — el lenguaje de reglas no ofrece un `forEach`/`map` sobre listas para validar objetos anidados arbitrarios). Las reglas de arriba validan que `players` sea una lista acotada en tamaño, pero NO validan que cada elemento tenga exactamente `{heroId, heroName, playerName}` con los tipos correctos — un documento con `players: [{ basura: 'x' }]` pasaría la regla. Esto es una limitación aceptada, no un descuido: cerrarla del todo exigiría indexar `players[0]`, `players[1]`, ... hasta el tope de tamaño, con una condición por índice, lo que en la práctica es ilegible y fragil frente a cambios de `maxPlayers`. Dado que el peor caso es "basura con forma parcialmente inválida en un campo anidado de un documento write-only que nadie lee" (D-11's propio razonamiento sobre qué puede hacer un hostil), se recomienda aceptar esta limitación explícitamente en vez de perseguir una validación perfecta.

### `firebase.json` / `.firebaserc` — mínimos para desplegar solo reglas (D-15)

```json
// firebase.json — raíz del repo, committeado
{
  "firestore": {
    "rules": "firestore.rules"
  }
}
```
```json
// .firebaserc — raíz del repo, committeado (el project id NO es secreto, D-13)
{
  "projects": {
    "default": "<firebase-project-id>"
  }
}
```
**Confirmado (`[CITED]`, WebSearch cruzado con la documentación oficial de gestión de reglas):** estos dos ficheros bastan para que `npx firebase-tools deploy --only firestore:rules` funcione sin pasar por `firebase init` completo — no hace falta `firestore.indexes.json` si no se declara ninguna consulta compuesta (esta colección es write-only, sin consultas de ningún tipo desde el cliente).

### `e2e/bundle-budget.spec.ts` — gate de D-16, verificado contra un `nuxt generate` real de este repo

```ts
// e2e/bundle-budget.spec.ts
// D-16: gate para el criterio de éxito 3. Vive en e2e/, no en engine/ ni
// app/composables/__tests__/ (Pitfall 3 arriba) — Playwright ya garantiza
// vía su webServer (playwright.config.ts) que `.output/public` existe de
// verdad antes de que este fichero se ejecute.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

const PUBLIC_DIR = join(process.cwd(), '.output/public')
// Confirmado por ejecución real de `npm run generate` en este repo
// (2026-09-22): cada ruta prerenderizada tiene su propio index.html bajo
// .output/public/<ruta>/index.html (la raíz vive en .output/public/index.html).
const ENTRY_HTML_FILES = [
  join(PUBLIC_DIR, 'index.html'),
  join(PUBLIC_DIR, 'marvel-champions/index.html'),
]

// Confirmado por lectura real del HTML generado: las referencias a chunks
// siguen el patrón _nuxt/<hash>.<js|css> tanto en <script> como en <link>.
const CHUNK_REF = /_nuxt\/[\w.-]+\.(?:js|css)/g

// Presupuesto de tamaño: línea base real medida en esta sesión para la
// ruta "/" antes de esta fase era ~229 KB sin comprimir en JS de entrada
// (9 chunks). Se deja MARGEN explícito para el propio código nuevo de esta
// fase (el guard + el listener `online`, no el SDK de Firebase, que nunca
// debe aparecer aquí) — el planner debe fijar la cifra definitiva tras medir
// su propia implementación, esto es un valor de partida, no un contrato.
const MAX_INITIAL_JS_BYTES = 260 * 1024

test.describe('Presupuesto del bundle inicial (D-16, SYNC-05)', () => {
  test('ni "/" ni "/marvel-champions" cargan el SDK de Firebase en su chunk inicial', () => {
    const seenChunks = new Set<string>()
    for (const htmlPath of ENTRY_HTML_FILES) {
      const html = readFileSync(htmlPath, 'utf-8')
      for (const match of html.matchAll(CHUNK_REF)) seenChunks.add(match[0])
    }

    expect(seenChunks.size, 'no se encontró ningún chunk _nuxt/* en el HTML generado — el patrón de nombrado cambió').toBeGreaterThan(0)

    let totalBytes = 0
    for (const chunk of seenChunks) {
      // Solo los .js cuentan para el presupuesto/gate de contenido — el CSS
      // no puede contener un import de Firebase.
      if (!chunk.endsWith('.js')) continue
      const contents = readFileSync(join(PUBLIC_DIR, chunk), 'utf-8')
      totalBytes += Buffer.byteLength(contents, 'utf-8')
      expect(contents, `${chunk} referencia "firebase" en el chunk inicial de / o /marvel-champions`).not.toContain('firebase')
    }

    expect(totalBytes, `el JS inicial de / y /marvel-champions pesa ${totalBytes} bytes, por encima del presupuesto`).toBeLessThanOrEqual(MAX_INITIAL_JS_BYTES)
  })
})
```

## Assumptions Log

| # | Afirmación | Sección | Riesgo si es incorrecta |
|---|------------|---------|--------------------------|
| A1 | El nombre de paquete `firebase` (SDK modular) es el correcto — conocido por la investigación de hito previa (`SUMMARY.md`), no descubierto de nuevo por WebSearch en esta sesión, pero tampoco confirmado vía Context7/documentación-como-fuente-de-nombre en esta sesión concreta | Standard Stack | Bajo — el paquete existe en el registro (`npm view` lo confirma), tiene 7,4M descargas/semana y repo oficial `firebase/firebase-js-sdk`; el riesgo real de slopsquatting es prácticamente nulo, pero el protocolo exige la etiqueta igualmente |
| A2 | El código de error `'permission-denied'`/`'unavailable'` de un `setDoc` rechazado son los strings exactos que expone la versión 12.19.0 del SDK — confirmado por búsqueda cruzada de documentación/issues, no ejecutado contra un proyecto Firebase real en esta sesión | Code Examples, Pitfall (D-03) | Bajo — el código no depende de distinguir estos strings (D-03 los trata igual), solo importa si se implementa el logging de diagnóstico opcional |
| A3 | El presupuesto de 260 KB del gate de D-16 es un punto de partida razonable, no una cifra derivada de medir la implementación real de esta fase (que todavía no existe) | Code Examples | Bajo-medio — un presupuesto mal calibrado falla en falso el primer build tras implementar la fase; el planner debe medir y ajustar tras la Task 1 de esta fase, no confiar en el número de este documento como definitivo |
| A4 | Firebase Auth con persistencia por defecto no escribe a IndexedDB de forma que rompa SYNC-09 — confirmado que SYNC-09 habla específicamente de la cola de mutaciones de FIRESTORE, no de dónde Auth guarda su propio token de sesión, pero no se ejecutó contra un proyecto real para confirmar qué almacén usa Auth en esta versión concreta del SDK | Phase Requirements (SYNC-09) | Bajo — aunque Auth usara IndexedDB para su propio token de sesión, eso es un dato de Firebase (no de esta app) y no es lo que SYNC-09 prohíbe; vale la pena que el planner lo lea explícitamente en el checkpoint humano en vez de asumirlo |

**Si esta tabla parece corta:** es porque la mayoría de las afirmaciones de este documento se apoyaron en lectura directa del repo (`Read`/`Bash` en esta sesión) o en documentación oficial de Nuxt/Firebase leída con `WebFetch`/`WebSearch` en esta sesión, y quedan marcadas `[VERIFIED]`/`[CITED]` en el cuerpo del documento en vez de aparecer aquí.

## Open Questions

1. **¿Cuál es el presupuesto de tamaño definitivo para el gate de D-16?**
   - Qué sabemos: la línea base de hoy (~229 KB de JS inicial en `/`), medida real en esta sesión.
   - Qué no está claro: cuánto añade el propio código de esta fase (guard + listener `online` + `useRuntimeConfig`) antes de que el SDK de Firebase entre en juego — probablemente unos pocos KB, pero no medido porque la fase no está implementada todavía.
   - Recomendación: el planner fija la cifra definitiva como parte de la Task que implementa el gate, midiendo el build real tras el resto de la fase — no antes.

2. **¿El listener `online` se registra en un plugin de Nuxt, en `app.vue`, o dentro del propio `useHistorySync.ts`?**
   - Qué sabemos: D-02 exige que "nada se dispare en el arranque de la app ni al cargar una ruta" — el registro del listener en sí (barato, sin importar Firebase) no viola eso, pero el SITIO donde vive determina cuántas veces se registra/limpia.
   - Qué no está claro: si un listener `window.addEventListener('online', ...)` registrado una vez por `setup()` de un composable usado en varias páginas se duplica si el composable se invoca más de una vez.
   - Recomendación: registrar dentro de `useHistorySync()` con `onMounted`/`onUnmounted` (o el patrón ya establecido en este repo para listeners de ciclo de vida, si existe uno) — dejado a discreción del planner por CONTEXT.md.

## Environment Availability

| Dependencia | Requerida por | Disponible | Versión | Alternativa |
|--------------|----------------|------------|---------|--------------|
| Cuenta/proyecto Firebase real | Escritura real en Firestore, despliegue de reglas | ✗ (no verificable desde este entorno de investigación) | — | D-14: sin `.env` configurado, la guarda de D-13 convierte todo en no-op — `npm run dev`/tests nunca necesitan un proyecto real |
| `firebase-tools` (CLI) | Despliegue de `firestore.rules` (D-15) | ✓ — confirmado disponible en el registro npm (`15.30.2`), invocable vía `npx` sin instalación previa | 15.30.2 | Ninguna necesaria — es exactamente el uso previsto (herramienta puntual, no dependencia) |
| Login de `firebase-tools` (`firebase login`) | Ejecutar el `deploy` real | ✗ (requiere credenciales humanas, fuera de este entorno) | — | Ninguna — es un paso manual explícito de D-15, no automatizable en CI |

**Dependencias ausentes sin alternativa:** ninguna que bloquee la implementación del código de esta fase — el proyecto Firebase real y el login de `firebase-tools` son pasos de despliegue humano, ya previstos como tales por D-14/D-15.

## Security Domain

### Categorías ASVS aplicables

| Categoría ASVS | Aplica | Control estándar |
|-----------------|--------|--------------------|
| V2 Autenticación | Parcial | Auth anónima de Firebase (`signInAnonymously`) — no autentica una identidad real, solo da a las reglas un `uid` estable con el que expresar propiedad sintáctica (D-11 lo dice explícitamente: no es una puerta de entrada de seguridad, es un rótulo) |
| V3 Gestión de sesión | No | No hay sesión de usuario en el sentido de la app — la sesión anónima la gestiona el SDK de Firebase internamente |
| V4 Control de acceso | Sí | Reglas `create`-only de Firestore (D-11) — la única barrera de control de acceso real de esta fase, evaluada por Google, nunca por el cliente |
| V5 Validación de entrada | Sí | `hasOnly()` + comprobación de tipos por campo en `firestore.rules` (D-09/D-12) — con la limitación documentada arriba sobre objetos anidados en listas |
| V6 Criptografía | No | Ninguna operación criptográfica propia de esta fase; la clave de API de Firebase no es un secreto (documentado explícitamente en D-13 y en `PITFALLS.md` §5) |

### Patrones de amenaza conocidos para este stack

| Patrón | STRIDE | Mitigación estándar |
|--------|--------|------------------------|
| Un visitante del repo público escribe basura directamente contra el proyecto Firebase real usando el `projectId`/config visible en el bundle | Tampering | Reglas `create`-only + validación de forma (D-11) — el peor caso es basura acotada en tamaño, nunca lectura ni borrado de datos reales |
| Agotamiento de cuota (Spark plan, 20.000 escrituras/día) por un actor hostil o por un bug propio en bucle | Denial of Service | Aceptado explícitamente (D-08, `PITFALLS.md` §5): el respaldo deja de sincronizar hasta el reinicio diario, `localStorage` (fuente de verdad) no se ve afectado |
| Suplantación de `uid` ajeno | Spoofing | NO mitigado de verdad — cualquiera puede llamar a `signInAnonymously` y obtener su propio `uid` válido; D-11 acepta esto explícitamente porque el uid solo expresa propiedad sintáctica, no identidad verificada — documentado aquí para que quede escrito, no descubierto tarde |
| Documento con `createdAt` antedatado | Tampering | `request.resource.data.createdAt == request.time` en la regla — el cliente no puede fijar su propia marca de tiempo de servidor |

## Sources

### Primary (HIGH confidence)
- Lectura directa de este repo en esta sesión: `app/composables/useGameHistory.ts`, `app/composables/usePersistedSession.ts`, `app/pages/[game]/index.vue`, `nuxt.config.ts`, `package.json`, `vitest.config.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`, `e2e/offline-flow.spec.ts`, `engine/types.ts`, `content/marvel-champions.json`, `.gitignore`.
- Ejecución real de `npm run generate` en este repo (2026-09-22) e inspección de `.output/public/index.html`, `.output/public/marvel-champions/index.html` y los chunks `_nuxt/*.js` que referencian — confirma el diseño concreto del gate D-16.
- `npm view firebase version` / `npm view firebase-tools version` (2026-09-22) — versiones exactas.
- `gsd_run query package-legitimacy check --ecosystem npm firebase firebase-tools` (2026-09-22) — veredictos SUS, ver Package Legitimacy Audit.

### Secondary (MEDIUM confidence)
- `nuxt.com/docs/4.x/directory-structure/app/composables` (WebFetch) — confirma ausencia de mención del sufijo `.client`/`.server`.
- `nuxt.com/docs/4.x/directory-structure/app/plugins` (WebFetch) — confirma que el sufijo SÍ está documentado, pero solo para plugins.
- `nuxt.com/docs/4.x/api/advanced/import-meta` (WebFetch) — `import.meta.client`/`import.meta.server`.
- `nuxt.com/docs/4.x/guide/going-further/runtime-config` (WebSearch, resumen de fuente oficial) — horneado en build time para SSG, convención `NUXT_PUBLIC_*`.
- `firebase.google.com/docs/auth/web/anonymous-auth`, `firebase.google.com/docs/firestore/security/rules-conditions`, `firebase.google.com/docs/firestore/security/rules-fields`, `firebase.google.com/docs/rules/manage-deploy` (WebSearch, resúmenes de fuente oficial) — sintaxis de reglas, patrón de auth anónima, despliegue mínimo.
- GitHub issues cruzados de `firebase/firebase-js-sdk` (WebSearch) — comportamiento de cola de mutaciones con/sin `persistentLocalCache`, códigos de error `permission-denied`/`unavailable`.

### Tertiary (LOW confidence)
- Ninguna afirmación de este documento queda solo en esta categoría sin una nota `[ASSUMED]` explícita en el cuerpo (ver Assumptions Log).

## Metadata

**Confidence breakdown:**
- Standard stack: ALTA para versiones (verificadas por `npm view` en esta sesión) — MEDIA para el nombre del paquete en sí (heredado de investigación previa, no re-descubierto de fuente autorizada en esta sesión, de ahí el `[ASSUMED]` en la tabla)
- Architecture: ALTA — los tres hallazgos centrales (sufijo `.client.ts`, race de auth anónima, forma real de `.output/public`) están verificados por lectura de documentación oficial y/o ejecución real en este repo, no por training data sin contrastar
- Pitfalls: ALTA para el Pitfall 3 (CI/gate, verificado por lectura directa de `ci.yml`/`vitest.config.ts`/`playwright.config.ts`); MEDIA para los Pitfalls 1-2 (verificados contra documentación oficial, no contra un proyecto Firebase real)

**Fecha de investigación:** 2026-09-22
**Válido hasta:** 30 días (dominio de dependencias externas de cadencia de release alta — Firebase publica versiones nuevas con frecuencia; re-verificar `npm view firebase version` si esta fase se planea/ejecuta más de un mes después de esta fecha)
