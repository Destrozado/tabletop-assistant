---
status: complete
phase: 10-respaldo-en-firestore
source: [10-01-SUMMARY.md, 10-02-SUMMARY.md, 10-03-SUMMARY.md, 10-04-SUMMARY.md]
started: "2026-09-22T23:57:28Z"
updated: "2026-09-23T00:01:22Z"
---

## Current Test

[testing complete]

## Tests

### 1. setDoc a history/{id} con el id local como id de documento
expected: Cada partida registrada con éxito produce un setDoc a history/{id} con el id local como id de documento (SYNC-01)
result: pass
source: automated
coverage_id: 10-01/D1

### 2. La subida es dispara-y-olvida
expected: record() nunca espera (await) a la subida a Firestore y sigue devolviendo su booleano de forma síncrona (SYNC-02)
result: pass
source: automated
coverage_id: 10-01/D2

### 3. Marca tga:history:synced apartada de tga:history
expected: tga:history:synced registra los ids ya subidos tras un setDoc resuelto, apartada de tga:history (SYNC-03, parte de este plan)
result: pass
source: automated
coverage_id: 10-01/D3

### 4. SDK de Firebase solo por import() dinámico
expected: El SDK se carga solo por import() dinámico, nunca estático, y con projectId vacío ninguno de los tres módulos llega a ejecutarse (SYNC-05)
result: pass
source: automated
coverage_id: 10-01/D4

### 5. Auth anónima sin uid duplicado por carrera
expected: Se espera una vez a onAuthStateChanged antes de decidir si hace falta signInAnonymously, evitando un uid duplicado por condición de carrera (SYNC-06)
result: pass
source: automated
coverage_id: 10-01/D5

### 6. Caché de Firestore en memoria
expected: Ninguna llamada a persistentLocalCache ni a enableIndexedDbPersistence — el caché queda en memoria por defecto (SYNC-09)
result: pass
source: automated
coverage_id: 10-01/D6

### 7. firestore.rules permite solo create con forma validada
expected: read/update/delete denegados de forma explícita; create solo con la forma validada (D-09/D-11/D-12) (SYNC-07)
result: pass
source: automated
coverage_id: 10-02/D1

### 8. El gate de contrato ata las reglas a SYNC_PAYLOAD_FIELDS
expected: La lista blanca de las reglas y SYNC_PAYLOAD_FIELDS de engine/sync.ts no pueden divergir en silencio — el gate se pone rojo si lo hacen
result: pass
source: automated
coverage_id: 10-02/D2

### 9. Revisión humana de las reglas de Firestore realmente desplegadas
expected: Las reglas que Google evalúa en producción son, carácter a carácter, las mismas que firestore.rules del repo — read/update/delete denegados, catorce claves exactas en hasOnly(), createdAt == request.time, un único bloque match /history/{docId} — y la autenticación anónima está habilitada en la consola. Aceptada además por escrito la limitación de players[] (T-10-09).
result: pass
reported: "pass"

### 10. Un solo flush arrastra todo el atraso
expected: Un solo flush sube TODAS las partidas pendientes de tga:history, sin ningún tope por ráfaga (SYNC-03/D-08)
result: pass
source: automated
coverage_id: 10-03/D1

### 11. tga:history:synced se escribe una vez por flush, ya podada
expected: Se escribe exactamente una vez por flush, ya podada (D-04) de ids cuya entrada ya no existe en tga:history
result: pass
source: automated
coverage_id: 10-03/D2

### 12. El evento online es el segundo disparador de flush()
expected: El evento online reintenta pendientes reales y no toca Firebase cuando no hay nada pendiente (SYNC-03/D-02)
result: pass
source: automated
coverage_id: 10-03/D3

### 13. Todos los caminos de fallo terminan en silencio
expected: Rechazo por reglas, red caída, auth rota, import() roto, guardado local fallido y reentrada terminan en silencio y la entrada sigue pendiente — ninguno propaga hacia record() (SYNC-08)
result: pass
source: automated
coverage_id: 10-03/D4

### 14. Rastro diagnosticable dev-only y solo error.code
expected: El log de fallo existe solo bajo import.meta.dev y solo imprime error.code, nunca el objeto de error completo
result: pass
source: automated
coverage_id: 10-03/D5

### 15. El SDK no está en los chunks iniciales
expected: Ni / ni /marvel-champions cargan el SDK de Firebase en su arranque, con techo de bytes medido y prueba de que el chunk del SDK no está referenciado (SYNC-05/D-16)
result: pass
source: automated
coverage_id: 10-04/D1

### 16. Terminar una partida sin red no se cuelga
expected: Con la red cortada, terminar una partida por el camino real de la interfaz registra el resultado, vuelve al inicio en un plazo corto, y /historico y /estadisticas siguen mostrando los mismos datos (SYNC-04/SYNC-08)
result: pass
source: automated
coverage_id: 10-04/D2

### 17. El camino de actualización de la PWA sigue intacto
expected: registerType en modo aviso, sin runtimeCaching, cabeceras de routeRules y rutas prerenderizadas intactas tras la Fase 10 (COMP-03)
result: pass
source: automated
coverage_id: 10-04/D3

## Summary

total: 17
passed: 17
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none — 17/17 resolved, sin incidencias]
