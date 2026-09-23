---
phase: 10-respaldo-en-firestore
plan: 02
subsystem: sync
tags: [firebase, firestore-rules, security-rules, firebase-tools, playwright-gate]

requires:
  - phase: 10-respaldo-en-firestore
    provides: "10-01: engine/sync.ts (buildSyncPayload/SYNC_PAYLOAD_FIELDS), la proyección pura por lista blanca que este plan ata mecánicamente a firestore.rules"
provides:
  - "firestore.rules committeado en la raíz: create-only con hasOnly()/hasAll() sobre las catorce claves, tipo por campo, tope de 8 jugadores, uid==request.auth.uid y createdAt==request.time (D-09/D-11/D-12)"
  - "firebase.json y .firebaserc con el id REAL del proyecto (tabletop-assistant-f637e), listos para `npx firebase-tools deploy --only firestore:rules` (D-15)"
  - ".env.example con las cuatro variables NUXT_PUBLIC_FIREBASE_* vacías (D-13/D-14)"
  - "e2e/firestore-rules-contract.spec.ts: gate mecánico que compara hasOnly() de las reglas con SYNC_PAYLOAD_FIELDS + uid + createdAt, verificado en rojo ante una mutación real"
  - "revisión humana bloqueante de la Task 3 APROBADA: reglas desplegadas comparadas carácter a carácter contra el fichero committeado, limitación de players[] aceptada por escrito, auth anónima confirmada habilitada"
affects: []

actuals:
  tokens: 2716
  tasks: 3
  commits: 3
plan_head_before: 0d56c39c8e20aae6a513b656285e3040b1816fec

tech-stack:
  added: []
  patterns:
    - "Reglas de seguridad como el único artefacto de confianza de un repo público: fichero committeado + gate mecánico de contrato + revisión humana bloqueante ANTES de la primera escritura real, nunca revisión post-hoc"
    - "Gate de contrato por lectura de texto (node:fs) sobre firestore.rules, mismo patrón que e2e/update-banner.spec.ts (10-04) extendió después a nuxt.config.ts — extractHasOnlyFields() recorta hasOnly([...]) igual que extractPrerenderRoutes() recorta nitro.prerender.routes"

key-files:
  created:
    - firestore.rules
    - firebase.json
    - .env.example
    - e2e/firestore-rules-contract.spec.ts
  modified:
    - .firebaserc

key-decisions:
  - "El proyecto real de Firebase es tabletop-assistant-f637e, con una segunda cuenta de Google añadida a firebase-tools (login:add) y anclada SOLO a este directorio (login:use), sin tocar la cuenta global usada en otros proyectos del usuario"
  - "La base de datos Firestore se recreó en Location eur3: el primer `firebase deploy --only firestore:rules` la creó automáticamente en nam5 (multirregión EE.UU., ubicación irreversible), y con la base aún vacía se borró y se recreó en eur3 antes de que existiera ningún dato real que perder"
  - "El checkpoint bloqueante de Task 3 se aprobó explícitamente ('aprobado') tras revisar los tres bloques A/B/C contra el texto REALMENTE publicado en la consola, no contra el fichero del repo"

requirements-completed: [SYNC-06, SYNC-07]

coverage:
  - id: D1
    description: "firestore.rules permite únicamente create con forma validada (D-09/D-11/D-12); read/update/delete denegados de forma explícita (SYNC-07)"
    requirement: "SYNC-07"
    verification:
      - kind: other
        ref: "grep -c \"allow read, update, delete: if false\" firestore.rules → 1; grep -c \"allow read: if true\" firestore.rules → 0; grep -c \"request.resource.data.uid == request.auth.uid\" firestore.rules → 1; grep -c \"request.resource.data.createdAt == request.time\" firestore.rules → 1; grep -c \"players.size()\" firestore.rules → 1; grep -c \"match /\" firestore.rules → 2"
        status: pass
      - kind: e2e
        ref: "e2e/firestore-rules-contract.spec.ts#la lista de hasOnly() de las reglas es exactamente SYNC_PAYLOAD_FIELDS + uid + createdAt"
        status: pass
      - kind: e2e
        ref: "e2e/firestore-rules-contract.spec.ts#las reglas deniegan explícitamente read/update/delete"
        status: pass
      - kind: other
        ref: "mutación ejecutada y revertida (quitar durationMs de hasOnly()) puso el gate en rojo nombrando el campo exacto — ver commit ced2481"
        status: pass
    human_judgment: false
  - id: D2
    description: "El gate de contrato ata mecánicamente la lista blanca de las reglas a SYNC_PAYLOAD_FIELDS de engine/sync.ts, para que ambas listas no puedan divergir en silencio"
    requirement: "SYNC-07"
    verification:
      - kind: e2e
        ref: "e2e/firestore-rules-contract.spec.ts (2/2 tests en verde, ejecutados en esta sesión)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Revisión humana bloqueante de las reglas REALMENTE desplegadas, antes de la primera escritura real (Task 3) — comparación carácter a carácter consola↔repo, confirmación de los seis puntos del bloque B (incluida auth anónima habilitada, SYNC-06), y aceptación por escrito de la limitación de players[] (T-10-09)"
    requirement: "SYNC-06"
    verification: []
    human_judgment: true
    rationale: "Es por definición una verificación humana — comparar el texto de la consola de Firebase contra el fichero del repo y confirmar la configuración de Authentication no es algo que un test automatizado de este repo pueda ejecutar. Ya se realizó y quedó aprobada explícitamente por el usuario; documentada abajo con el detalle de cada bloque."
    resolved: "aprobado por el usuario — ver sección 'Revisión humana de la Task 3' más abajo"

duration: 15min
completed: 2026-09-23
status: complete
---

# Phase 10 Plan 2: Reglas de Firestore create-only y revisión humana del despliegue real Summary

**`firestore.rules` create-only (catorce claves con `hasOnly()`, tipos por campo, tope de 8 jugadores, `uid`/`createdAt` de servidor) desplegado en el proyecto real `tabletop-assistant-f637e` (Firestore en `eur3`), con un gate mecánico que ata su lista blanca a `SYNC_PAYLOAD_FIELDS` y la revisión humana bloqueante APROBADA antes de la primera escritura real.**

## Performance

- **Duration:** ~15 min en esta sesión de cierre (Task 3 + commit de `.firebaserc` + SUMMARY). Las Tasks 1 y 2 se ejecutaron y commitearon en una sesión previa (`1d79e26`, `ced2481`); el checkpoint humano bloqueante de la Task 3 se aprobó entre sesiones.
- **Started:** 2026-09-22 (Tasks 1-2) / continuación 2026-09-23 (cierre de Task 3)
- **Completed:** 2026-09-23T01:14:00Z (aprox.)
- **Tasks:** 3 (2 `auto` + 1 `checkpoint:human-verify` bloqueante)
- **Files modified:** 5 (4 nuevos, 1 modificado)

## Accomplishments

- `firestore.rules` nuevo en la raíz del repo: `allow read, update, delete: if false` explícito; `allow create` con `hasOnly()` sobre las catorce claves (las doce de `SYNC_PAYLOAD_FIELDS` más `uid` y `createdAt`), `hasAll()` sobre las diez obligatorias, tipo por campo, `players.size() <= 8`, `uid == request.auth.uid` y `createdAt == request.time` (D-09/D-11/D-12). Cabecera con las cuatro notas exigidas: acoplamiento mecánico con el gate, limitación aceptada de `players[]`, comando de despliegue manual (D-15), y que el fichero committeado es la única fuente de verdad.
- `firebase.json` mínimo (`{ "firestore": { "rules": "firestore.rules" } }`, sin `hosting` ni `firestore.indexes`) y `.firebaserc` con el id REAL del proyecto `tabletop-assistant-f637e` (sustituyendo el marcador de posición que Task 1 dejó pendiente).
- `.env.example` con las cuatro variables `NUXT_PUBLIC_FIREBASE_*` vacías y comentarios sobre por qué el repo público exige no committearlas con valor (D-13/D-14).
- `e2e/firestore-rules-contract.spec.ts` nuevo: extrae la lista de `hasOnly()` de `firestore.rules` y la compara contra `SYNC_PAYLOAD_FIELDS` + `uid` + `createdAt`, con mensajes que nombran el campo exacto que sobra o falta. Se ejecutó una mutación real (quitar `durationMs` de la lista) que puso el gate en rojo nombrando el campo, y se revirtió sin dejar diferencias residuales (documentado en el commit `ced2481`).
- **Task 3 — revisión humana bloqueante APROBADA.** El usuario desplegó las reglas desde el fichero committeado, comparó el texto publicado en la consola de Firebase carácter a carácter contra `firestore.rules` del repo, confirmó los seis puntos del bloque B (incluida la auth anónima habilitada en Authentication → Sign-in method, SYNC-06), y aceptó por escrito la limitación de `players[]` del bloque C. Respondió «aprobado».
- `firebase-tools` sigue sin instalarse como dependencia (`grep -c 'firebase-tools' package.json` → 0) — se invoca puntualmente con `npx` (D-15).
- Suite completa reverificada tras el cierre: `npx vitest run` 1128/1128, `npx playwright test` 41/41 (incluidos los 2 tests del gate de contrato), `npm run typecheck` sin errores.

## Task Commits

Cada tarea se commiteó atómicamente:

1. **Task 1: `firestore.rules`, `firebase.json` y `.firebaserc` committeados** — `1d79e26` (feat)
2. **Task 2: `.env.example` y el gate de contrato entre las reglas y la proyección** — `ced2481` (feat)
3. **Task 3: revisión humana de las reglas REALMENTE desplegadas** — checkpoint bloqueante sin commit de código propio; el cierre de esta tarea produjo el commit `ac539d2` (id real del proyecto en `.firebaserc`)

**Plan metadata:** (este commit, ver más abajo)

**Nota sobre el recuento de commits (#3968):** este plan corre sin aislamiento de worktree (ejecución secuencial sobre la rama compartida `develop`), y entre el momento en que se fijó el ledger de este plan y el cierre de la Task 3 se ejecutaron y commitearon por completo los planes hermanos 10-03 (3 commits) y 10-04 (3 commits) sobre la misma rama. El recuento mecánico `git rev-list --count ${PLAN_HEAD_BEFORE}..HEAD` da 11, pero eso incluye esos 6 commits ajenos más el commit de metadata `docs(10-04)`. El recuento real de commits de ESTE plan, verificado por `git log --grep="10-02"` contra el rango, es **3**: `1d79e26`, `ced2481`, `ac539d2`. `plan_head_before` queda registrado tal cual para que `/gsd-verify-work` pueda reproducir la comparación.

## Files Created/Modified

- `firestore.rules` — reglas create-only con validación de forma completa (D-09/D-11/D-12) y las instrucciones de despliegue manual en su cabecera
- `firebase.json` — configuración mínima para `firebase deploy --only firestore:rules`
- `.firebaserc` — id real del proyecto Firebase (`tabletop-assistant-f637e`), sustituyendo el marcador de posición
- `.env.example` — las cuatro variables `NUXT_PUBLIC_FIREBASE_*`, todas vacías
- `e2e/firestore-rules-contract.spec.ts` — gate que compara la lista de `hasOnly()` de las reglas con `SYNC_PAYLOAD_FIELDS`

## Decisions Made

- **Proyecto real: `tabletop-assistant-f637e`.** El usuario añadió una segunda cuenta de Google a `firebase-tools` (`login:add`) y la ancló SOLO a este directorio de proyecto (`login:use` desde `~/tabletop-assistant`), evitando cambiar de cuenta globalmente entre sus proyectos.
- **Incidencia de infraestructura resuelta durante el checkpoint: recreación de la base de datos en `eur3`.** El primer `firebase deploy --only firestore:rules` creó la base de datos Firestore por su cuenta, sin preguntar, en `Location: nam5` (multirregión de EE.UU.) — la ubicación de una base Firestore es irreversible. Con la base todavía vacía, el usuario decidió recrearla: se borró (`firestore:databases:delete "(default)"`), se esperó la reserva de ~5 min del ID, y se recreó con `firestore:databases:create "(default)" --location eur3`. Estado final confirmado: `Location eur3`, `Type FIRESTORE_NATIVE`, `Edition STANDARD`. Las reglas se redesplegaron después, porque el borrado de la base se lleva el release por delante.
- **Bloque A del checkpoint (desplegar y comparar): CONFORME.** El usuario desplegó desde el fichero committeado y pegó el texto íntegro de las reglas publicadas (leído en la consola de Firebase). El orquestador lo comparó contra `firestore.rules` del repo: coinciden, incluida la cabecera de comentarios completa. Siete propiedades verificadas una a una: `allow read, update, delete: if false;`; `hasOnly()` con los catorce nombres en el mismo orden (`id gameId result lossCause villainId villainName players difficulty playerCount round durationMs recordedAt uid createdAt`); `hasAll()` con los diez obligatorios; `createdAt == request.time;`; `uid == request.auth.uid`; únicamente los bloques `match /databases/{database}/documents` y `match /history/{docId}`; y AUSENCIA de cualquier `match /{document=**}` comodín. Método: los invariantes del lado local se extrajeron mecánicamente con `grep`/`sed`; el texto de la consola se comparó por lectura, no con un `diff` byte a byte (retranscribir el pegado habría podido introducir una diferencia falsa).
- **Bloque B del checkpoint (leer las reglas desplegadas): CONFORME**, los seis puntos, incluido el sexto: proveedor de acceso **Anónimo HABILITADO** en Authentication → Sign-in method (SYNC-06).
- **Bloque C del checkpoint (limitación de `players[]`): ACEPTADA POR ESCRITO.** El usuario aceptó explícitamente, a sabiendas, que el lenguaje de reglas de Firestore no puede recorrer `players[]` para validar la forma de cada elemento: un documento con `players: [{ basura: 'x' }]` pasaría la regla mientras respete el tope de 8 elementos. Disposición `accept` de T-10-09 en el threat model del plan. Peor caso aceptado: basura parcialmente inválida en un campo anidado de un documento write-only que ninguna pantalla de la app lee jamás.
- **La regla dura de ordenación se respetó.** Verificado inmediatamente antes de este cierre: no existe fichero `.env` local, y las cuatro claves de `.env.example` siguen vacías (`grep -c "^NUXT_PUBLIC_FIREBASE_.*=$" .env.example` = 4). NINGUNA variable `NUXT_PUBLIC_FIREBASE_*` se rellenó en ningún sitio antes de la aprobación. Nada ha escrito todavía en el proyecto real: la app sigue siendo no-op hasta que esas variables se declaren en Vercel, que es trabajo posterior a esta fase (fuera de alcance de esta fase — declarado en `user_setup` como paso pendiente del usuario).

## Revisión humana de la Task 3 (checkpoint bloqueante)

**Veredicto: APROBADO** (respuesta textual del usuario: «aprobado»).

| Bloque | Contenido | Resultado |
|--------|-----------|-----------|
| A — Desplegar y comparar | Despliegue real ejecutado; texto de la consola comparado carácter a carácter (siete propiedades) contra `firestore.rules` del repo | CONFORME |
| B — Leer las reglas desplegadas | Seis puntos confirmados sobre el texto de la consola: `read`/`update`/`delete` en `false`, catorce claves exactas en `hasOnly()`, `createdAt == request.time`, un único bloque `match /history/{docId}`, y auth anónima habilitada | CONFORME |
| C — Limitación de `players[]` | Aceptada por escrito, a sabiendas del peor caso (T-10-09, disposición `accept`) | ACEPTADO |

No hubo huecos que registrar textualmente en ningún bloque.

## Deviations from Plan

### Auto-fixed Issues

Ninguna dentro de las Reglas 1-3 durante esta sesión de cierre — el trabajo restante era estrictamente el commit de `.firebaserc` (ya editado a mano por el usuario con el id real) y la documentación.

### Incidencia de infraestructura (no una desviación del plan, documentada por transparencia)

**Recreación de la base de datos Firestore (`nam5` → `eur3`).** No es un desvío de este plan ni de sus tareas: es un efecto secundario del primer despliegue real (`firebase deploy --only firestore:rules` crea la base de datos por defecto si no existe, sin preguntar la región). Se documenta aquí porque afecta directamente al entorno real sobre el que se hizo la revisión de la Task 3, y porque la ubicación de una base Firestore es irreversible — el usuario decidió corregirla mientras la base seguía vacía, antes de que existiera ningún dato real que perder.

---

**Total deviations:** 0 auto-fixed. Una incidencia de infraestructura documentada (recreación de región, resuelta antes de cualquier escritura real).
**Impact on plan:** Ninguno sobre el alcance de este plan. El estado final (`eur3`, reglas verificadas) es el que la Task 3 exigía revisar, y así se revisó.

## Issues Encountered

Ninguno más allá de la incidencia de infraestructura ya documentada arriba (resuelta antes del cierre).

## User Setup Required

**Pendiente, explícitamente fuera de alcance de este plan (declarado en `user_setup` de `10-02-PLAN.md`):** declarar las cuatro variables `NUXT_PUBLIC_FIREBASE_*` como variables de entorno de BUILD en Vercel y redesplegar. Hasta que eso ocurra, la app sigue siendo un no-op respecto a Firebase (guarda de configuración D-13) — ninguna partida real se sube todavía. Esta declaración es la única pieza de `user_setup` que no se realiza dentro de la ejecución de este plan (es explícitamente trabajo del usuario, posterior a la fase, y la regla dura de ordenación de la Task 3 prohibía adelantarla).

## Next Phase Readiness

- SYNC-06 y SYNC-07 quedan listos para marcarse `Complete` en `REQUIREMENTS.md` (SYNC-06 lo declaran también 10-01, ya con SUMMARY; gate de IDs compartidos #2388 satisfecho).
- La Fase 10 queda con sus cuatro planes completos (10-01, 10-02, 10-03, 10-04) — es el último plan del hito v1.8.
- El respaldo en Firestore está protegido por su única barrera real (las reglas), revisada por una persona contra el despliegue REAL, con un gate mecánico que impide que la lista blanca del cliente y la de las reglas diverjan en silencio.
- Bloqueo restante, fuera de alcance de cualquier plan de esta fase: declarar las cuatro variables `NUXT_PUBLIC_FIREBASE_*` en Vercel (Build-time) y redesplegar — sin eso, la sincronización real nunca ocurre, por diseño (D-13).

## Self-Check: PASSED

- `firestore.rules` — FOUND
- `firebase.json` — FOUND
- `.env.example` — FOUND
- `e2e/firestore-rules-contract.spec.ts` — FOUND
- `.firebaserc` contiene `tabletop-assistant-f637e` (no el marcador de posición) — FOUND
- Commit `1d79e26` — FOUND en `git log --oneline`
- Commit `ced2481` — FOUND en `git log --oneline`
- Commit `ac539d2` — FOUND en `git log --oneline`
- `npx playwright test e2e/firestore-rules-contract.spec.ts --reporter=list` — 2/2 en verde (reejecutado en esta sesión)
- `npx playwright test --reporter=list` — 41/41 en verde (reejecutado en esta sesión)
- `npx vitest run` — 1128/1128 en verde (reejecutado en esta sesión)
- `npm run typecheck` — sin errores (reejecutado en esta sesión)
- `git check-ignore -q firestore.rules` / `firebase.json` / `.firebaserc` — los tres exit 1 (NO ignorados, viajan en el repo)
- `git check-ignore -q .env.example` — exit 1 (NO ignorado); `.env` no existe en el árbol de trabajo
- Los criterios de aceptación de las tres tareas (greps + tests + mutación) — todos PASS, ver comandos ejecutados en la sesión

---
*Phase: 10-respaldo-en-firestore*
*Completed: 2026-09-23*
