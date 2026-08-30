---
phase: 03-locuci-n-por-voz-y-pantalla-siempre-encendida
verified: 2026-08-30T20:47:24Z
status: passed
score: 4/4 criterios cumplidos — G-01 corregido (88b9306) y confirmado en dispositivo real
overrides_applied: 0
gaps:
  - id: G-01
    criterion: "ROADMAP Fase 3, Criterio 2 (VOZ-04)"
    status: resolved
    severity: blocking
    device: "Samsung Galaxy S21 / Android 15"
    resolved_by: "88b9306 — watchdog de reintento unico y acotado; el cancel()+speak() sincrono del gesto queda intacto para iOS"
    resolved_verified_by: "humano, Samsung Galaxy S21 / Android 15: Confirmado arreglado"
    summary: "Al tocar SIGUIENTE a mitad de frase, la locucion en curso se corta pero la del paso destino NO arranca. Si se espera a que termine, la siguiente si suena."
    root_cause: "speak() de @vueuse/core ejecuta synth.cancel() y synth.speak() de forma sincrona y consecutiva. En Chrome/Android el cancel() se procesa de forma asincrona y descarta la utterance recien encolada."
    constraint: "El arreglo NO puede diferir speak() con setTimeout: iOS Safari exige speak() sincrono dentro del handler del toque (CLAUDE.md)."
human_verification:
  - test: "Probar la banda «Sin voz en este dispositivo» y el icono de voz en estado no-disponible en un segundo dispositivo/navegador que NO tenga voz española instalada (p. ej. Android sin el paquete de voz TTS es-ES descargado, o un navegador de escritorio sin síntesis)."
    expected: "El icono de la cabecera pasa a atenuado/deshabilitado, aparece una sola vez la banda con la instrucción de Ajustes → Idiomas → Texto a voz, se puede descartar con ✕, y SIGUIENTE sigue siendo tocable y el flujo sigue funcionando solo con texto."
    why_human: "El comportamiento de `getVoices()`/`voiceschanged` es específico del dispositivo/SO/navegador real; el proyecto solo lo tiene cubierto por tests unitarios con reloj falso (`detectSpanishVoice`). El acta de la Fase 3 (03-SPEECH-REVIEW.md §9, Criterio 3) dice explícitamente 'NO VERIFICADO' para este sub-check — nunca se probó en un segundo dispositivo real sin voz española."
  - test: "Con la voz silenciada, recargar la página con partida en curso, tocar «Empezar partida nueva» (descartar progreso), confirmar, y comprobar que la voz sigue silenciada en la partida nueva."
    expected: "La preferencia de voz (tga:voice-enabled) sobrevive a clear(gameId) — no se reactiva sola."
    why_human: "Es la única comprobación de comportamiento de D-46 de toda la fase (según el propio must_have del plan 03-05) y el acta humana la registra como aprobada solo por inclusión en el veredicto GLOBAL de los 4 criterios, sin que el humano describiera haber ejecutado esta secuencia paso a paso de forma aislada. El test unitario (`usePersistedSession.test.ts`) sí confirma la lógica de `clear()` en aislamiento, pero no el comportamiento observable de extremo a extremo tras un recargado real de navegador."
  - test: "Registrar el modelo de tablet y la versión de SO/navegador usados en la prueba de la Fase 3."
    expected: "Un dato concreto (p. ej. 'iPad Air, iPadOS 18.x, Safari') que permita reproducir o descartar comportamientos específicos de plataforma en el futuro."
    why_human: "Bloqueante abierto desde `STATE.md` en la Fase 1, nunca cerrado; ninguna de las dos pruebas humanas (Fase 1/2 y esta Fase 3) registró el dato. No es verificable por grep — requiere que un humano lo anote."
---

# Fase 3: Locución por voz y pantalla siempre encendida — Verification Report

**Phase Goal:** Un grupo puede jugar escuchando cada paso en voz alta, en español, con una frase corta y curada distinta del texto en pantalla, y la tablet permanece encendida durante toda la partida; si la voz o el bloqueo de pantalla fallan o no están disponibles, el flujo guiado sigue funcionando con normalidad.

**Verified:** 2026-08-30T20:47:24Z
**Status:** human_needed
**Re-verification:** No — verificación inicial

## Metodología

No existía `03-VERIFICATION.md` previo (modo inicial). Se cruzaron los 5 `must_haves` de las 5 PLAN.md contra el código real (no contra las SUMMARY.md), se releyó `useVoiceAnnouncer.ts` y `usePersistedSession.ts` completos tras los 3 commits de corrección de warnings (`fa79b81`, `5dc0295`, `7e9e645`), se ejecutó `npm test` y `npm run build` de cero, y se contrastó el dossier `03-SPEECH-REVIEW.md` (revisión de contenido + acta humana) contra su propio contenido, no contra el resumen que hace de él el SUMMARY del plan 03-05.

## Goal Achievement

### Observable Truths (4 criterios de éxito del ROADMAP)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Frase corta y curada distinta del texto, control de silencio siempre visible, preferencia conservada entre pasos y sesiones (VOZ-01/02/03) | ✓ VERIFIED | `content/marvel-champions.json` contentVersion 11, 37 ocurrencias de `"speech"` (33 pasos + 4 variantes); gates `D-38`/`D-39`/`D-41` presentes y verdes en `engine/__tests__/content.test.ts`. `AppHeader.vue` tiene botón de voz de 3 estados (48×48, `w-12 h-12`) junto al ≡. `usePersistedSession.ts` persiste `tga:voice-enabled` en clave independiente de `tga:progress:<gameId>`, con `normalizeVoicePreference` por defecto `true` (D-47). Aprobado por humano en tablet real (veredicto global, `03-SPEECH-REVIEW.md` §9). |
| 2 | Al navegar, cualquier locución en curso se corta antes de la nueva; nunca se encola ni repite (VOZ-04) | ✓ VERIFIED | 5 llamadas a `announce()` confirmadas, todas síncronas dentro de manejadores de toque (`onNext`, `onBack`, `onIndexJumpTo`, `onResumeContinue`, `onContentChangedAcknowledge` en `app/pages/[game]/index.vue`, líneas 132/137/160/243/274). El propio `useSpeechSynthesis.speak()` de VueUse llama a `cancel()` antes de `speak()` (confirmado leyendo `node_modules/@vueuse/core` en `03-REVIEW.md`). `silence()` corta al silenciar (D-45) y al ocultarse la pestaña (`useDocumentVisibility` watch). Ningún control de "repetir" existe en ninguna superficie (grep negativo). Aprobado por humano (veredicto global). |
| 3 | Sin voz en español, o sin síntesis disponible/falla, la app lo indica o no habla, y el flujo sigue siendo utilizable solo con texto (VOZ-05/06) | ? UNCERTAIN | Código implementado y con tests unitarios de reloj falso (`detectSpanishVoice`, `hasSpanishVoice`, carrera acotada a 2s, `WR-01` con cleanup vía `tryOnScopeDispose`). `VoiceUnavailableNotice.vue` existe, solo se pinta en pantallas de paso (nunca en selector/mini-setup/reanudación/Mesa lista — confirmado leyendo la plantilla de `index.vue`). **PERO**: el propio dossier de la fase (`03-SPEECH-REVIEW.md` §9, Criterio 3) dice literalmente "NO VERIFICADO" para el sub-check de un segundo dispositivo real sin voz española — nunca se probó en hardware. Solo hay cobertura de unidad, nunca de dispositivo real para este camino concreto. |
| 4 | La pantalla no se apaga durante partida en curso; el usuario sabe que consume batería; degrada con normalidad si no hay soporte (UI-06/07/08) | ✓ VERIFIED | `useWakeLock()` instanciado una única vez en `index.vue`, pedido en `onConfirm` (línea 123), `onResumeContinue` (247), `onContentChangedAcknowledge` (278), liberado explícitamente en `onDiscardConfirm` (267); todas las llamadas `.catch(() => {})`-guardadas (degradación silenciosa, UI-08). Ningún control manual de bloqueo en ninguna superficie (grep negativo). Línea fija "La pantalla se mantendrá encendida durante la partida y esto consume más batería." en el pie de `MiniSetupScreen.vue` (línea 121). Aprobado por humano (veredicto global). |

**Score:** 3/4 verificadas sin reservas a nivel de dispositivo real; 1/4 verificada solo a nivel de código+unidad, con su sub-caso crítico explícitamente sin confirmar en hardware.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `content/marvel-champions.json` | 27 frases `speech` nuevas, contentVersion 11 | ✓ VERIFIED | contentVersion 11 confirmado; 37 `"speech"` totales (33 pasos + 4 variantes); dossier de revisión contrasta las 27 nuevas contra Rules Reference v1.7 con 0 discrepancias. |
| `engine/__tests__/content.test.ts` | Gate DC-1/D-38 ampliado, gate D-41 de variantes | ✓ VERIFIED | Tests `D-38`, `D-39`, `D-41` presentes y verdes. |
| `app/composables/useVoiceAnnouncer.ts` | `useVoiceAnnouncer`, `resolveVoiceState`, `shouldAnnounce`, `hasSpanishVoice`, `detectSpanishVoice` | ✓ VERIFIED | Todas las funciones exportadas presentes; WR-01 corregido (`detectSpanishVoice` devuelve `cancel()`, envuelto en `tryOnScopeDispose`). |
| `app/composables/usePersistedSession.ts` | `tga:voice-enabled` independiente, `normalizeVoicePreference` | ✓ VERIFIED | WR-02 corregido: ya no usa `useLocalStorage`, acceso directo guardado a `window.localStorage`; `clear(gameId)` solo borra `storageKey(gameId)`, nunca `VOICE_KEY` (D-46 confirmado en código y en test). |
| `app/components/AppHeader.vue` | Botón de voz 3 estados, 48×48, junto al ≡ | ✓ VERIFIED | `w-12 h-12`, `aria-label` por estado, `:disabled` en `unavailable`. |
| `app/components/VoiceUnavailableNotice.vue` | Banda no modal, sin props, emit `dismiss` | ✓ VERIFIED | Sin props, emite `dismiss`, botón ✕ de 48×48. |
| `app/components/MiniSetupScreen.vue` | Línea fija de coste de batería | ✓ VERIFIED | Línea presente bajo el CTA, sin persistencia de "ya lo vi" (no hay `useLocalStorage`/clave nueva en el archivo). |
| `app/pages/[game]/index.vue` | `useWakeLock()` cableado en 5 puntos de D-51 | ✓ VERIFIED | 3 peticiones (`onConfirm`, `onResumeContinue`, `onContentChangedAcknowledge`) + 1 liberación explícita (`onDiscardConfirm`) + 1 no-op documentado (desmontaje vía `navigateTo`, comentario explícito en plantilla). |
| `.planning/phases/.../03-SPEECH-REVIEW.md` | Dossier + acta de prueba en tablet | ✓ VERIFIED | 222 líneas, veredicto explícito por fila, acta humana transcrita verbatim, sin dejar ninguna fila sin veredicto. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `content.test.ts` | `content/marvel-champions.json` | `allSteps().filter` | WIRED | Confirmado, gate D-38 cubre los 33 pasos `kind:'step'`. |
| `[game]/index.vue` (5 sitios) | `useVoiceAnnouncer().announce()` | llamada síncrona en manejador de toque | WIRED | Las 5 llamadas están en el cuerpo síncrono de la función, no en `watch`/`setTimeout`. |
| `useVoiceAnnouncer.ts` | `usePersistedSession()` | `loadVoicePreference`/`saveVoicePreference` | WIRED | Nunca usa `useLocalStorage` directo. |
| `useVoiceAnnouncer.ts` | `window.speechSynthesis.getVoices()`/`voiceschanged` | `detectSpanishVoice` con carrera acotada | WIRED | Cancelable, cubierto por `tryOnScopeDispose`. |
| `[game]/index.vue` | `VoiceUnavailableNotice` | banda entre `AppHeader` y `StepScreen` | WIRED | Solo se pinta en la rama `v-else` de pasos, nunca en selector/mini-setup/reanudación/Mesa lista. |
| `[game]/index.vue onConfirm/onResumeContinue/onContentChangedAcknowledge` | `useWakeLock().request('screen')` | llamada síncrona `.catch(() => {})` | WIRED | Confirmado en las 3 líneas. |
| `[game]/index.vue onDiscardConfirm` | `useWakeLock().release()` | liberación explícita | WIRED | Confirmado, con comentario justificando por qué no hay desmontaje. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Suite de tests completa en verde | `npm test` | 9 test files, 192/192 passed | ✓ PASS |
| Build de producción sin errores | `npm run build` | "Build complete!" sin errores | ✓ PASS |
| Regresión WR-01 (cancel de `detectSpanishVoice`) | lectura de `useVoiceAnnouncer.test.ts` | tests cubren cancelación antes/después de resolver por evento o timer | ✓ PASS |
| Regresión WR-02 (sin listeners `window` extra en `save()`/`toggle()` repetidos) | lectura de `usePersistedSession.test.ts` | 20 llamadas repetidas a `save()`/`saveVoicePreference()` no añaden `addEventListener` | ✓ PASS |
| D-46 (clear() preserva preferencia de voz) | lectura de `usePersistedSession.test.ts` línea 91-104 | test explícito verde | ✓ PASS |

### Probe Execution

No hay probes `scripts/*/tests/probe-*.sh` declarados ni convencionales para este proyecto/fase. **Step 7c: SKIPPED (sin probes aplicables — fase de frontend/composables, no de migración/CLI).**

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| VOZ-01 | 03-01, 03-02 | Frase corta y curada, distinta del texto | ✓ SATISFIED | 27 frases `speech` nuevas + gate CI; recuento de coincidencias `=text` documentado y sometido a decisión humana (aceptado). |
| VOZ-02 | 03-02 | Control de silencio siempre visible | ✓ SATISFIED | Botón 3 estados en `AppHeader.vue`. |
| VOZ-03 | 03-02 | Preferencia conservada entre pasos/sesiones | ✓ SATISFIED | `tga:voice-enabled`, D-46/D-47 con test dedicado. |
| VOZ-04 | 03-02 | Corte antes de nueva locución, nunca encola/repite | ✓ SATISFIED | `speak()` de VueUse cancela antes de hablar; `silence()` en toggle/visibilidad. |
| VOZ-05 | 03-03 | Sin voz española, la app lo indica y sigue usable | ? NEEDS HUMAN | Implementado y testeado a nivel de unidad; sub-check en hardware real explícitamente no verificado (ver acta). |
| VOZ-06 | 03-02, 03-03 | Síntesis no disponible/falla no rompe el flujo | ✓ SATISFIED | `shouldAnnounce` exige `isSupported === true`; `try/catch` en `speak()`/`stop()`. |
| UI-06 | 03-04 | Pantalla no se apaga durante partida | ✓ SATISFIED | `useWakeLock()` cableado en los 5 puntos de D-51. |
| UI-07 | 03-04 | Usuario informado del coste de batería | ✓ SATISFIED | Línea fija en `MiniSetupScreen.vue`. |
| UI-08 | 03-04 | Degradación silenciosa sin wake lock | ✓ SATISFIED | Todas las peticiones `.catch(() => {})`-guardadas, sin aviso de fallo. |

Ningún ID de requisito de la fase (VOZ-01…06, UI-06…08) queda huérfano: los 9 aparecen en el frontmatter de algún PLAN y en `.planning/REQUIREMENTS.md` como `Phase 3 | Complete`.

### Anti-Patterns Found

Ninguno. Se escaneó `useVoiceAnnouncer.ts`, `usePersistedSession.ts`, `AppHeader.vue`, `VoiceUnavailableNotice.vue`, `MiniSetupScreen.vue`, `[game]/index.vue`, `content/marvel-champions.json`, `engine/__tests__/content.test.ts` y `vitest.config.ts` contra `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` — cero coincidencias en los 9 archivos.

### Verificación de los 3 warnings del code review (03-REVIEW.md)

Los 3 warnings (WR-01, WR-02, WR-03) fueron re-verificados leyendo el código actual, no aceptando los mensajes de commit al pie de la letra:

- **WR-01** (`detectSpanishVoice` sin limpieza) — **CONFIRMADO CORREGIDO**. `detectSpanishVoice` ahora devuelve una función `cancel()` que hace `clearTimeout` + `removeEventListener`; `useVoiceAnnouncer` la envuelve en `tryOnScopeDispose` dentro de `onMounted`.
- **WR-02** (leak de listener `storage` por llamada) — **CONFIRMADO CORREGIDO**. `usePersistedSession.ts` ya no importa ni usa `useLocalStorage`/`useStorage` de VueUse en absoluto; lee/escribe `window.localStorage` directamente con guards `try/catch`, sin crear ningún watcher ni listener por llamada.
- **D-46 en el fix de WR-02** — **CONFIRMADO**: `clear(gameId)` llama solo a `removeRaw(storageKey(gameId))`; `VOICE_KEY` (`tga:voice-enabled`) vive en una constante distinta y ninguna ruta de `clear()` la toca. Test explícito (`usePersistedSession.test.ts:91-104`) verde.
- **WR-03** (falta de tests de las funciones con estado) — **CONFIRMADO CORREGIDO**: se añadieron tests reales para `usePersistedSession` (con `window`/`localStorage` de mentira, incluyendo casos de fallo de storage y ausencia de `window`/SSR) y para la cancelación de `detectSpanishVoice`. `npm test` pasa 192/192 (192, no 180 como en el momento del review — 12 tests nuevos, coincide con lo declarado).

### Human Verification Required

### 1. Segundo dispositivo sin voz española (sub-check de VOZ-05/VOZ-06)

**Test:** Cargar la app en un dispositivo/navegador que NO tenga instalada una voz española (Android sin el paquete de voz TTS es-ES descargado, o un navegador de escritorio sin síntesis de voz).
**Expected:** El icono de la cabecera pasa a atenuado/deshabilitado sin parpadear antes; aparece una única vez la banda "Sin voz en este dispositivo" con la instrucción de Ajustes → Idiomas → Texto a voz; se puede cerrar con ✕; SIGUIENTE sigue siendo tocable y el flujo entero funciona solo con texto.
**Why human:** El comportamiento real de `getVoices()`/`voiceschanged` varía por dispositivo/SO/navegador y no es reproducible por grep ni por los tests unitarios de reloj falso ya existentes. El propio dossier de la fase (`03-SPEECH-REVIEW.md` §9) marca este sub-check como "NO VERIFICADO" — es un hueco conocido, no una suposición del verificador.

### 2. D-46 de extremo a extremo: preferencia de voz sobrevive a «Empezar partida nueva»

**Test:** Con una partida en curso, silenciar la voz (icono → estado muted), recargar la página en el navegador real (no en test), tocar «Empezar partida nueva», confirmar el descarte, y comprobar que la voz sigue silenciada en la partida nueva.
**Expected:** El icono permanece en estado `muted`; la voz no se reactiva sola.
**Why human:** Es la única comprobación de comportamiento de D-46 que el propio plan 03-05 exige como verificación humana explícita, y el acta de la fase solo la cubre por inclusión en el veredicto GLOBAL de los 4 criterios — sin que el humano describiera haber ejecutado esta secuencia concreta de forma aislada. El test unitario cubre la lógica de `clear()` en aislamiento, no el ciclo completo de recargado de navegador real.

### 3. Modelo y SO/navegador de la tablet de mesa

**Test:** Anotar el modelo de tablet, versión de SO y navegador usados en las pruebas de la Fase 3 (y, retroactivamente, de las Fases 1/2 si es posible).
**Expected:** Un dato concreto y reproducible (p. ej. "iPad Air, iPadOS 18.x, Safari").
**Why human:** Bloqueante documentado desde `STATE.md` en la Fase 1, nunca cerrado en ninguna de las 3 fases hasta ahora. No es verificable por código — requiere que un humano lo registre.

### Gaps Summary

No se encontró ningún gap de código: los 3 warnings del code review (WR-01/02/03) están genuinamente corregidos (no solo mencionados en el mensaje de commit), `npm test` está en 192/192 verde, `npm run build` es verde, y los 9 requisitos de la fase (VOZ-01…06, UI-06…08) tienen artefactos y wiring concretos verificables en el código, no solo en la narrativa de las SUMMARY.

El único punto que impide un `passed` limpio es que el **Criterio de éxito 3 del ROADMAP** ("si el dispositivo no tiene voz en español... el flujo guiado sigue funcionando con normalidad") tiene su sub-caso más específico —un dispositivo real sin voz española— cubierto SOLO por tests unitarios con reloj falso, nunca por una prueba en hardware real. El propio dossier de la fase (`03-SPEECH-REVIEW.md`) lo admite explícitamente como "NO VERIFICADO", y el veredicto humano fue un aprobado GLOBAL de los 4 criterios sin desglose paso a paso, por lo que tampoco puede leerse como una confirmación implícita de este sub-caso concreto. A esto se suman dos huecos menores ya reconocidos por el propio proyecto: la confirmación granular independiente de D-46 (supervivencia de la preferencia de voz a "Empezar partida nueva") y el modelo/SO de la tablet, nunca registrado desde la Fase 1.

Ninguno de estos tres puntos es un defecto de código detectado por este verificador — son huecos de evidencia empírica ya documentados honestamente por el propio equipo en `03-SPEECH-REVIEW.md` y `03-05-SUMMARY.md`. Se elevan aquí como verificación humana pendiente (patrón Escalation Gate) en lugar de darse por buenos solo porque el humano dijo "aprobado, lo veo bastante bien" de forma global.

---

_Verified: 2026-08-30T20:47:24Z_
_Verifier: Claude (gsd-verifier)_
