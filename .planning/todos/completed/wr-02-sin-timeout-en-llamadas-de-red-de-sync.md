---
id: wr-02-sin-timeout-en-llamadas-de-red-de-sync
created: 2026-09-23
source: 10-REVIEW.md (WR-02), confirmado por el orquestador contra el código
severity: warning
area: respaldo en Firestore
status: completed
resolves_phase:
completed: 2026-09-23
resolved_by: 260923-3rj
---

# Ninguna llamada de red del respaldo tiene tope de tiempo

## Qué pasa

`app/composables/useHistorySync.ts` no contiene ni un `setTimeout`, ni un `Promise.race`, ni un
`AbortController` (verificado por grep sobre el fichero completo). Ni `setDoc`, ni
`signInAnonymously`, ni `onAuthStateChanged` tienen tope.

El comportamiento documentado de Firestore es que una escritura lanzada estando genuinamente sin
red puede dejar su promesa **sin resolver indefinidamente**. Mientras eso ocurre, la guarda de
reentrada `flushInFlight` queda enclavada, y con ella el segundo disparador de D-02 —el listener
del evento `online`, pensado exactamente para el caso «vuelve la wifi»— queda inutilizado hasta
que la escritura original se resuelva por su cuenta.

Dicho de otro modo: el mecanismo diseñado para recuperarse de quedarse sin red puede quedar
desactivado precisamente por haberse quedado sin red.

## Por qué no se arregló en la Fase 10

Se clasificó como deuda consciente al cerrar la fase, junto con WR-03, priorizando WR-01 (que sí
tiene consecuencia permanente). No bloquea: el flujo de fin de partida nunca espera a `flush()`,
así que un flush enclavado es invisible para quien juega — solo retrasa el respaldo.

## Arreglo sugerido

Envolver cada llamada de red en un `Promise.race` contra un temporizador, y liberar
`flushInFlight` en el camino de timeout igual que en el de error. Añadir un test que simule una
promesa que nunca se resuelve y compruebe que un `online` posterior sí dispara un flush nuevo.

Relacionado: [[wr-03-workbox-precachea-el-sdk-de-firebase]]

## Resolución (quick 260923-3rj, 2026-09-23)

`app/composables/useHistorySync.ts` gana `SYNC_NETWORK_TIMEOUT_MS` (15 s, el extremo generoso
del rango 10-15 s que este mismo todo proponía) y un helper `withTimeout` (`Promise.race` contra
un `setTimeout`), aplicado a las cuatro esperas de red: el `import()` del SDK (los tres módulos en
un solo `Promise.all`), la espera de `onAuthStateChanged` (con baja explícita del listener en el
`catch` si vence el plazo), `signInAnonymously` y el `setDoc` del bucle de `syncPending`.

Un intento que vence su plazo rechaza con `SyncTimeoutError` y cae en el mismo `catch`/`.finally`
que ya usaba el camino de error: nunca añade su id a `tga:history:synced` (ningún «sincronizado»
falso) y `flushInFlight` se libera exactamente igual que ante un rechazo — el segundo disparador
de D-02 (el evento `online`) recupera su función. Un `setDoc` que vence corta la vuelta actual
(`break` del bucle en vez de seguir con la siguiente entrada): las entradas subidas antes en esa
misma vuelta siguen quedando marcadas (D-04/WR-01 intacto, una sola escritura de marcas por
flush) y las no intentadas quedan pendientes para el siguiente disparador. Los rechazos que no
son timeout (`permission-denied`/`unavailable`) siguen el comportamiento de D-03 sin cambios.

`flush()` sigue síncrona, `void` y sin lanzar (D-05/D-07); `record()` no se toca.

Seis tests nuevos en `app/composables/__tests__/useHistorySync.test.ts` (describe `WR-02`, con
`vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })`): setDoc colgado (WR-02/1), espera
de auth colgada con baja del listener (WR-02/2), alta anónima colgada (WR-02/3), import() colgado
con recuento de temporizadores armados/liberados (WR-02/4), corte de vuelta con marcas parciales
(WR-02/5), y ningún temporizador vivo tras un flush exitoso (WR-02/6).
