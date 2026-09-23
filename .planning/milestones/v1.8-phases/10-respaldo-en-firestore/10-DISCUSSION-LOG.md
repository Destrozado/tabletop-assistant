# Phase 10: Respaldo en Firestore - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-22
**Phase:** 10-Respaldo en Firestore
**Areas discussed:** Marca de sync y reintento, Punto de enganche de la subida, Documento y reglas de Firestore, Config/forks/entornos

---

## Selección de áreas

| Option | Description | Selected |
|--------|-------------|----------|
| Marca de sync y reintento | Dónde vive la marca, qué dispara el flush, idempotencia del id | ✓ |
| Punto de enganche de la subida | Desde `record()` o desde la página tras D-U4 | ✓ |
| Documento y reglas de Firestore | Qué campos suben, estructura de colección, reglas, metadatos | ✓ |
| Config, forks y entornos | Claves, guarda de configuración, entornos, despliegue de reglas | ✓ |

**User's choice:** las cuatro.
**Notes:** cinco decisiones se presentaron como ya cerradas aguas arriba (mecanismo de cola, prohibición de `await`, carga diferida, write-only, D-14 de la Fase 9) y no se sometieron a discusión.

---

## Marca de sync y reintento

### ¿Dónde vive la marca de "ya subida"?

| Option | Description | Selected |
|--------|-------------|----------|
| Clave aparte con los ids | `tga:history:synced`; el camino de red nunca reescribe `tga:history` | ✓ |
| Campo dentro de la entrada | `syncedToFirestore: true` sobre la entrada, como recomienda `ARCHITECTURE.md` | |
| Tú decides | Lo resuelve el planner | |

**User's choice:** clave aparte.
**Notes:** decisivo el hecho de que `appendHistoryEntry` reescriba el envoltorio entero y que CR-01/CR-03 de la Fase 9 blindaran ese camino contra escrituras concurrentes.

### ¿Qué dispara el reintento de los pendientes?

| Option | Description | Selected |
|--------|-------------|----------|
| Registro + evento `online` | Cada fin de partida arrastra pendientes; listener `online` para la wifi que vuelve | ✓ |
| Solo al registrar una partida | Cero listeners; un pendiente puede esperar semanas | |
| Registro + `online` + al abrir /historico | Más ocasiones, pero mete red en una pantalla que debe ser local | |

**User's choice:** registro + `online`.

### ¿Cómo se escribe el documento y qué pasa si se pierde el ACK?

| Option | Description | Selected |
|--------|-------------|----------|
| El id local ES el id del documento | `setDoc`; duplicados imposibles; un reintento sobre existente se rechaza y queda pendiente | ✓ |
| `addDoc` con id autogenerado | Nada se queda colgado; un ACK perdido duplica la partida en la nube | |
| Tú decides | Lo resuelve el planner | |

**User's choice:** id local como id de documento.
**Notes:** se aceptó conscientemente el ruido de un pendiente que se reintenta para siempre.

### ¿Se podan los ids de partidas borradas?

| Option | Description | Selected |
|--------|-------------|----------|
| Poda perezosa en el flush | Se descarta lo que ya no esté en `tga:history`; `removeHistoryEntry` intacto | ✓ |
| No podar nunca | ~40 bytes por partida; basura que nadie limpia | |
| Podar al borrar la entrada | Segunda escritura en el camino de borrado que la Fase 9 blindó | |

**User's choice:** poda perezosa.

---

## Punto de enganche de la subida

### ¿De dónde sale la llamada dispara-y-olvida?

| Option | Description | Selected |
|--------|-------------|----------|
| Desde `record()`, tras el `true` local | Una sola costura; la página y el orden D-U4 no se tocan | ✓ |
| Desde la página, después de D-U4 completo | Deja `useGameHistory.ts` intacto; futuros llamadores se quedan sin respaldo | |
| Tú decides | Lo resuelve el planner | |

**User's choice:** desde `record()`.
**Notes:** hay que reescribir la cabecera de `record()`, que hoy declara la firma libre de efectos y anticipa literalmente esta fase.

### Si el guardado local falla, ¿se sube igualmente?

| Option | Description | Selected |
|--------|-------------|----------|
| No — sin registro local, no hay respaldo | Mantiene localStorage como única fuente de verdad; la marca tampoco podría escribirse | ✓ |
| Sí — justo entonces la nube es lo único que queda | Crea un documento sin equivalente local: la trampa de la doble fuente | |

**User's choice:** no.

### ¿Se ve el estado de sincronización en pantalla?

| Option | Description | Selected |
|--------|-------------|----------|
| Invisible del todo | Ninguna pantalla menciona la nube | ✓ |
| Indicio discreto en /historico | Un punto en las tarjetas pendientes | |
| Solo un contador en /estadisticas | «3 partidas pendientes de respaldo» al pie | |

**User's choice:** invisible del todo.

### ¿Cómo se sube el atraso inicial?

| Option | Description | Selected |
|--------|-------------|----------|
| Todo de golpe, sin tope | Decenas de partidas frente a 20.000 escrituras/día | ✓ |
| Tope por ráfaga (p. ej. 20) | Acota por si acaso; un contador más que mantener | |

**User's choice:** sin tope.

---

## Documento y reglas de Firestore

### ¿Qué campos viajan a Firestore?

| Option | Description | Selected |
|--------|-------------|----------|
| Proyección con lista blanca explícita | Campos nombrados uno a uno, patrón de `fetch-marvelcdb.mjs` | ✓ |
| La entrada entera tal cual | Copia fiel; cualquier campo futuro se subiría sin decidirlo | |
| Proyección SIN nombres de jugador | Los `playerName` se quedan en el dispositivo | |

**User's choice:** lista blanca **con** los nombres de jugador.
**Notes:** se ofreció explícitamente excluir los nombres y se rechazó.

### ¿Cómo se organiza la colección?

| Option | Description | Selected |
|--------|-------------|----------|
| Plana `history/{id}` con `uid` como campo | Todas las partidas en una lista; el uid anónimo rota | ✓ |
| Subcolección `users/{uid}/history/{id}` | La ruta expresa la propiedad; fragmenta el respaldo | |
| Tú decides | Lo resuelve el planner | |

**User's choice:** colección plana.

### ¿Qué permiten las reglas además de crear?

| Option | Description | Selected |
|--------|-------------|----------|
| Solo `create` | Nada de read, update ni delete | ✓ |
| `create` + `read` de los propios | Deja preparada una futura restauración | |
| `create` + `read` abierto | Lo que sugiere `PITFALLS.md:104` tal cual | |

**User's choice:** solo `create`.
**Notes:** resuelve a favor de SYNC-07 el conflicto documental con `research/PITFALLS.md:104`, cuyo argumento («las estadísticas necesitan leer») quedó obsoleto al cerrarse la Fase 9.

### ¿Qué metadatos añade el cliente?

| Option | Description | Selected |
|--------|-------------|----------|
| `uid` + `createdAt` de servidor | Validado con `request.time`; distingue cuándo se jugó de cuándo llegó | ✓ |
| Solo `uid` | Lo mínimo para hablar de propiedad | |
| `uid`, `createdAt` y versión de la app | Útil ante cambios de formato; la versión no está expuesta hoy | |

**User's choice:** `uid` + `createdAt`.

---

## Config, forks y entornos

### ¿Dónde vive la configuración de Firebase?

| Option | Description | Selected |
|--------|-------------|----------|
| `runtimeConfig.public` + env en Vercel | Guarda de config: `projectId` vacío ⇒ no-op antes del `import()` | ✓ |
| Committeadas tal cual en el repo | No son secreto, pero un fork escribiría en el proyecto real | |
| Tú decides | Lo resuelve el planner | |

**User's choice:** `runtimeConfig.public` + env.

### ¿`npm run dev` y los e2e escriben en el proyecto real?

| Option | Description | Selected |
|--------|-------------|----------|
| Un solo proyecto, y en local no se configura | La guarda convierte la sincronización en no-op sin `.env` | ✓ |
| Dos proyectos (dev y real) | Aislamiento total; dos juegos de reglas que mantener | |
| Emulador de Firestore en local | La forma correcta de probar reglas; una herramienta más | |

**User's choice:** un solo proyecto, no-op en local.

### ¿Dónde viven las reglas y cómo llegan a Firestore?

| Option | Description | Selected |
|--------|-------------|----------|
| `firestore.rules` committeado + despliegue manual | `firebase-tools` como herramienta puntual, no dependencia | ✓ |
| Escritas en la consola, con copia en el repo | Pueden divergir sin que nada avise | |
| Despliegue automático desde CI | Cuenta de servicio en un repo público | |

**User's choice:** fichero committeado, despliegue manual.
**Notes:** es lo que hace honesta la verificación humana exigida por el ROADMAP.

### ¿Cómo se comprueba que el SDK no entra en el arranque?

| Option | Description | Selected |
|--------|-------------|----------|
| Gate automatizado en CI | Falla si `firebase` aparece en los chunks iniciales o si crecen | ✓ |
| Comparación manual documentada | Cifras antes/después en el informe de verificación | |
| Tú decides | Lo resuelve el planner | |

**User's choice:** gate en CI.

---

## Claude's Discretion

El usuario eligió opción concreta en las dieciséis preguntas; no hubo ningún «tú decides».
Queda a criterio del planner, por ser detalle de implementación:

- Nombre y ubicación del composable de sincronización, y si el sufijo `.client.ts` se
  comporta como se espera para un composable en Nuxt 4.
- Dónde se registra y se limpia el listener `online`.
- Nombre exacto y formato interno de la clave de marcas.
- Cómo se prueba el composable en Vitest sin tocar Firestore real.
- Si un fallo deja rastro en consola solo en desarrollo.
- Comportamiento exacto si la auth anónima está deshabilitada en la consola.

## Deferred Ideas

- Restaurar el histórico desde Firestore — su propia fase.
- Indicio de pendiente en `/historico` o contador en `/estadisticas` (rechazados en D-07).
- Versión de la app como metadato del documento (rechazada en D-12).
- Emulador de Firestore y tests automatizados de reglas (rechazados en D-14).
- App Check — no se planteó; anotado como siguiente palanca si la basura llegara a ser un
  problema real.
