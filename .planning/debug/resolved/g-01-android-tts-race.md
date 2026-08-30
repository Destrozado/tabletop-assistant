---
status: resolved
trigger: "Fix gap G-01 en fase 03 — SIGUIENTE durante locución en curso en Android (Galaxy S21) cancela pero la siguiente frase nunca arranca"
created: 2026-08-30T00:00:00Z
updated: 2026-08-30T21:26:56Z
---

## Current Focus

reasoning_checkpoint:
  hypothesis: "useSpeechSynthesis().speak() de VueUse ejecuta synth.cancel(); synth.speak(utterance.value) de forma sincrona y consecutiva (confirmado leyendo node_modules/@vueuse/core/dist/index.js:6578-6581). En Chrome/Android, cancel() se procesa de forma asincrona internamente y puede descartar el utterance que speak() acaba de encolar en el mismo tick, sin lanzar ningun error -> la locucion del paso destino nunca arranca. Cuando no hay locucion en curso, cancel() es un no-op y speak() sobrevive, lo que explica la asimetria observada (funciona si se espera a que termine, falla si se pulsa SIGUIENTE a mitad de frase)."
  confirming_evidence:
    - "Lectura directa de node_modules/@vueuse/core/dist/index.js:6578-6581: speak = () => { synth.cancel(); if (utterance) synth.speak(utterance.value) } — sin await, sin setTimeout, cancel y speak son la misma sentencia sincrona."
    - "03-VERIFICATION.md (gap G-01, ya registrado por el propio verificador humano) documenta root_cause y constraint identicos, con reproduccion consistente en Samsung Galaxy S21 / Android 15 / Chrome, y NO reproducible esperando a que la frase termine antes de pulsar SIGUIENTE — coincide exactamente con la asimetria cancel()-no-op-vs-cancel()-async esperada."
  falsification_test: "Si tras instrumentar un fake speechSynthesis donde cancel() vacia sincronamente pendingSpeechQueue/currentUtterance ANTES de que speak() reencole (simulando el comportamiento real de Chrome/Android), el test de que 'la locucion del paso destino nunca arranca' NO reproduce el fallo (es decir, el utterance SI se reproduce), la hipotesis quedaria refutada."
  fix_rationale: "Anadir un watchdog acotado en el tiempo que, tras el intento sincrono cancel()+speak() (preservado intacto para no romper el requisito de gesto sincrono de iOS), compruebe si el utterance realmente arranco (via el propio status/isPlaying que expone useSpeechSynthesis, sin tocar utterance.onstart) y, si no arranco, reintente speak() UNA sola vez. Esto ataca la causa raiz (la perdida asincrona de la llamada a speak() en Android) sin diferir el intento inicial (que es lo que exige iOS) y sin introducir un bucle o una cola."
  blind_spots: "No se ha probado en un Galaxy S21 fisico (no disponible en este entorno) — la verificacion real queda pendiente de confirmacion humana. El retraso del watchdog (200ms) es una estimacion razonable pero no medida en el dispositivo real; si Chrome/Android tarda mas de 200ms en resolver cancel() de forma que descarte el utterance, el watchdog podria disparar una release falsa mientras el utterance SI iba a arrancar mas tarde (mitigado por comprobar status !== 'init', que solo pasa a 'play' cuando onstart realmente dispara, asi que un falso-retry en el peor caso simplemente reinicia una locucion que de todos modos aun no habia arrancado)."

next_action: esperar confirmacion humana en Samsung Galaxy S21 / Android 15 / Chrome (repetir la reproduccion original) antes de archivar la sesion

## Symptoms

expected: al pulsar SIGUIENTE mientras suena la frase del paso actual, esa locucion se corta y la frase del paso destino empieza a sonar (VOZ-04)
actual: en Samsung Galaxy S21 / Android 15 / Chrome, si se pulsa SIGUIENTE mientras la frase actual todavia se esta locutando, la locucion en curso se corta pero la frase del paso destino NUNCA arranca
errors: ninguno (fallo silencioso)
reproduction: "1) abrir juego en Chrome Android, 2) esperar a que empiece a sonar la frase de un paso, 3) pulsar SIGUIENTE mientras aun suena, 4) observar que no se oye nada del paso destino. No reproducible si se espera a que la frase actual termine antes de pulsar SIGUIENTE."
started: hallado en UAT humana de fase 03 (gap G-01)

## Eliminated

## Evidence

## Resolution

root_cause: |
  useSpeechSynthesis().speak() de @vueuse/core ejecuta `synth.cancel(); synth.speak(utterance.value)`
  de forma sincrona y consecutiva (confirmado leyendo node_modules/@vueuse/core/dist/index.js:6578-6581).
  En Chrome/Android, `cancel()` se resuelve de forma asincrona y puede descartar el utterance que
  `speak()` acaba de encolar en el mismo tick, sin lanzar ningun error. Cuando no hay locucion en
  curso, `cancel()` es un no-op y `speak()` sobrevive, lo que explica la asimetria observada
  (funciona si se espera a que termine la frase; falla si se pulsa SIGUIENTE a mitad).
fix: |
  Se extrajo una funcion pura `scheduleSpeakWatchdog(speak, getStatus, delayMs = 200)` (mismo patron
  que `detectSpanishVoice`) en app/composables/useVoiceAnnouncer.ts. announce() sigue llamando a
  `speak()` de forma SINCRONA dentro del manejador de toque, sin cambios (preserva el requisito de
  gesto de usuario de iOS Safari). Justo despues del intento sincrono, se programa el watchdog, que
  tras 200ms comprueba `status.value` (el mismo ref reactivo que expone useSpeechSynthesis, cableado
  por su propio `onstart` interno -> nunca se sobrescribe `onstart`): si sigue en 'init' (el
  navegador nunca disparo onstart -> el utterance se perdio en la carrera), reintenta `speak()` UNA
  sola vez; si ya avanzo (play/pause/end), es un no-op. El reintento esta acotado (no se
  reprograma a si mismo), es cancelable (`cancelWatchdog`/`clearPendingRetry`, invocado al inicio de
  cada announce() nuevo, en silence(), y via tryOnScopeDispose al desechar el scope), y esta envuelto
  en try/catch para no romper next()/prev() (VOZ-06) si el reintento tambien lanza.
verification: |
  Auto-verificado: `npm test` 199/199 verde (192 previos + 7 nuevos en useVoiceAnnouncer.test.ts que
  cubren scheduleSpeakWatchdog: reintento-por-carrera con fake synth cancel()/speak(), no-op cuando
  el primer intento arranca, cancelacion por segunda navegacion, acotado a un solo reintento, throw
  no propagado, y delayMs por defecto/personalizado). Confirmado que los 7 tests FALLAN contra el
  codigo pre-fix (git stash del archivo de produccion, 7 failed / 192 passed) y PASAN tras restaurar
  el fix (199/199). `npm run build` completa sin errores ("Build complete!").
  PENDIENTE: confirmacion humana en el Samsung Galaxy S21 / Android 15 / Chrome real (repetir la
  reproduccion original: pulsar SIGUIENTE a mitad de frase varias veces seguidas).
files_changed:
  - app/composables/useVoiceAnnouncer.ts
  - app/composables/__tests__/useVoiceAnnouncer.test.ts

- timestamp: 2026-08-30T00:05:00Z
  checked: node_modules/@vueuse/core/dist/index.js lines 6530-6612 (useSpeechSynthesis)
  found: |
    speak() is literally `const speak = () => { synth.cancel(); if (utterance) synth.speak(utterance.value) }` — synchronous, no await between cancel and speak. bindEventsForUtterance sets utterance.onstart -> isPlaying.value=true, status.value='play' (also onpause/onresume/onend/onerror/onboundary). The `utterance` computed resets `isPlaying.value=false; status.value='init'` at the top of its recompute, before constructing+binding the new SpeechSynthesisUtterance. status/isPlaying/utterance are all part of the returned object, so the composable's own state can be read without touching onstart directly.
  implication: |
    Confirms root cause exactly as given by the human report: on Chrome/Android, `cancel()` is processed async and can discard the utterance `speak()` just queued in the same synchronous tick, leaving nothing playing and no error thrown. Also confirms a safe detection signal that does not require overwriting onstart: watch `status.value` — it stays 'init' forever if onstart never fires, and flips to 'play' (then possibly 'pause'/'end') as soon as the browser actually starts the utterance. This lets a watchdog detect "never started" without clobbering VueUse's own onstart wiring.
- timestamp: 2026-08-30T00:06:00Z
  checked: .planning/phases/03-locuci-n-por-voz-y-pantalla-siempre-encendida/03-VERIFICATION.md gap G-01 frontmatter + report body
  found: root_cause and constraint recorded verbatim match the human-supplied brief; VOZ-04 criterion previously marked SATISFIED at code-review time based only on "speak() cancels before speaking" without accounting for the async cancel() race on real Android hardware.
  implication: confirms this is a genuine, previously-missed gap — not a duplicate of an already-eliminated hypothesis.
- timestamp: 2026-08-30T00:07:00Z
  checked: app/pages/[game]/index.vue — grep for announce() call sites (5 matches, lines 132/137/160/243/274)
  found: all 5 call sites are synchronous invocations inside tap/click handlers (onNext, onBack, onIndexJumpTo, onResumeContinue, onContentChangedAcknowledge) — none behind setTimeout/async/await.
  implication: the synchronous cancel()+speak() call chain on the tap path must be preserved untouched; the fix must live entirely inside useVoiceAnnouncer's announce()/watchdog, not in the call sites.
