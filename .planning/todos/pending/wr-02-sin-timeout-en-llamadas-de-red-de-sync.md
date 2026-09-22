---
id: wr-02-sin-timeout-en-llamadas-de-red-de-sync
created: 2026-09-23
source: 10-REVIEW.md (WR-02), confirmado por el orquestador contra el código
severity: warning
area: respaldo en Firestore
status: pending
resolves_phase:
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
