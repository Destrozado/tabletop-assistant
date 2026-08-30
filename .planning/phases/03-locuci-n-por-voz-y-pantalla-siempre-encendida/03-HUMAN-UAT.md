---
status: resolved
phase: 03-locuci-n-por-voz-y-pantalla-siempre-encendida
source: [03-VERIFICATION.md]
started: 2026-08-30T20:49:28Z
updated: 2026-08-30T21:26:47Z
---

## Current Test

[completado — 2 cerrados, 1 no aplicable, 1 defecto nuevo encontrado]

## Tests

### 1. Banda «Sin voz en este dispositivo» en un segundo dispositivo sin voz española  
status: skipped
expected: El icono de la cabecera pasa a atenuado/deshabilitado, aparece una sola vez la banda con la instrucción de Ajustes → Idiomas → Texto a voz, se puede descartar con ✕, y SIGUIENTE sigue siendo tocable y el flujo sigue funcionando solo con texto.
result: NO APLICABLE — el usuario no dispone de un segundo dispositivo sin voz española; no se puede forzar. Se acepta como hueco conocido: cubierto solo por tests unitarios con reloj falso.

### 2. D-46 granular: la preferencia de voz sobrevive a «Empezar partida nueva»
expected: Con la voz silenciada, recargar con partida en curso, tocar «Empezar partida nueva», descartar progreso y confirmar — la voz sigue silenciada en la partida nueva. La preferencia (tga:voice-enabled) sobrevive a clear(gameId).
result: PARCIAL — confirmado que la voz sigue silenciada tras RECARGAR la pagina habiendo silenciado. El usuario no describio por separado la pata de «Empezar partida nueva» (clear), que sigue cubierta solo por test unitario.

### 3. Registrar modelo de tablet y versión de SO/navegador
expected: Un dato concreto (p. ej. «iPad Air, iPadOS 18.x, Safari») que permita reproducir o descartar comportamientos específicos de plataforma. Bloqueante abierto desde la Fase 1.
result: CERRADO PARCIALMENTE — dispositivo de prueba: Samsung Galaxy S21, Android 15. Nota: es un MOVIL, no la tablet objetivo; el modelo/SO de la tablet sigue sin registrarse (bloqueante abierto desde Fase 1).

## Summary

total: 3
passed: 1
issues: 0
pending: 1
skipped: 1
blocked: 0

## Gaps

### G-01 — Al tocar SIGUIENTE a mitad de frase, la locucion se corta pero la siguiente NO arranca
status: resolved
resolved_by: 88b9306 (watchdog de reintento acotado, iOS intacto)
resolved_verified_by: humano, en Samsung Galaxy S21 / Android 15 — "Confirmado arreglado"
resolved_at: 2026-08-30T21:26:47Z
severity: blocking
criterion: ROADMAP Fase 3, Criterio de exito 2 (VOZ-04)
device: Samsung Galaxy S21 / Android 15 (Chrome)
observed: Si se toca SIGUIENTE mientras se esta locutando la frase del paso actual, la frase en curso se silencia y la del paso siguiente NO llega a sonar.
expected: La locucion en curso se corta Y arranca inmediatamente la del paso destino.
not_reproduced_when: Si se espera a que la frase actual termine y despues se toca SIGUIENTE, la frase siguiente si suena con normalidad.
hypothesis: Carrera conocida de speechSynthesis en Chrome/Android entre cancel() y el speak() inmediatamente posterior — el cancel() se procesa de forma asincrona y descarta la utterance recien encolada. NO CONFIRMADO todavia.
risk_on_fix: Cualquier arreglo que difiera speak() con setTimeout rompe iOS Safari, que exige speak() SINCRONO dentro del handler del toque (documentado en CLAUDE.md). El arreglo no puede romper el iPad.

