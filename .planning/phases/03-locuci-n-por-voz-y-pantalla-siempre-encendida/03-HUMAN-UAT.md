---
status: partial
phase: 03-locuci-n-por-voz-y-pantalla-siempre-encendida
source: [03-VERIFICATION.md]
started: 2026-08-30T20:49:28Z
updated: 2026-08-30T20:49:28Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Banda «Sin voz en este dispositivo» en un segundo dispositivo sin voz española
expected: El icono de la cabecera pasa a atenuado/deshabilitado, aparece una sola vez la banda con la instrucción de Ajustes → Idiomas → Texto a voz, se puede descartar con ✕, y SIGUIENTE sigue siendo tocable y el flujo sigue funcionando solo con texto.
result: [pending]

### 2. D-46 granular: la preferencia de voz sobrevive a «Empezar partida nueva»
expected: Con la voz silenciada, recargar con partida en curso, tocar «Empezar partida nueva», descartar progreso y confirmar — la voz sigue silenciada en la partida nueva. La preferencia (tga:voice-enabled) sobrevive a clear(gameId).
result: [pending]

### 3. Registrar modelo de tablet y versión de SO/navegador
expected: Un dato concreto (p. ej. «iPad Air, iPadOS 18.x, Safari») que permita reproducir o descartar comportamientos específicos de plataforma. Bloqueante abierto desde la Fase 1.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
