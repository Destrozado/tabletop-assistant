---
slug: audio-corta-y-reinicia
status: verifying
trigger: "El audio pregenerado suena ~1s, se corta y la frase vuelve a empezar desde cero."
created: 2026-08-31
updated: 2026-08-31
phase: 03.1
---

# Debug: el audio pregenerado se corta al segundo y vuelve a empezar

## Symptoms

**Expected behavior**
Al avanzar un paso que tiene clip pregenerado, el clip suena completo, una sola vez,
con la voz Rasalgethi (estilo `plano-agil`), y nada lo interrumpe.

**Actual behavior**
El audio empieza a sonar, suena aproximadamente un segundo, se para, y la frase
vuelve a empezar desde cero.

**Error messages**
Ninguno reportado por el usuario. No hay salida por consola por diseño: la capa
de voz y la de precarga tienen `grep -c "console\."` == 0 (D-07 exige respaldo
silencioso), así que la ausencia de errores en consola NO es evidencia de que no
haya fallo — es el comportamiento esperado del código.

**Timeline**
Nuevo. Es la primera vez que se prueba la reproducción de audio pregenerado en un
dispositivo real. Apareció en el primer despliegue que incluye el plan 03.1-05
(commit `5bfc10a`, desplegado en Vercel, estado Ready, duración 20s).

**Reproduction**
1. Abrir `https://tabletop-assistant.vercel.app` en Android (móvil Samsung, mismo
   SO que la tablet de mesa).
2. Empezar partida nueva de Marvel Champions en dificultad **Normal**.
3. Avanzar con SIGUIENTE por los pasos 1–8 de la preparación
   (`setup.heroes.01` … `setup.encuentros.03`) — son los que SÍ tienen clip.
4. El corte se oye en esos pasos, los que tienen audio real.

## Contexto imprescindible

- **Fase 03.1, parcialmente ejecutada.** Solo existen **9 de 37 clips**
  (`public/audio/*.m4a`) porque el tier gratuito de Gemini da 10 peticiones/día.
  Los pasos 1–8 en Normal tienen clip; del 9 en adelante cae al respaldo
  `speechSynthesis` **por diseño** (D-07). El bug NO es esa transición: ocurre
  dentro de los pasos que sí tienen clip.
- **D-07 (bloqueada):** un audio ausente o fallido cae a `speechSynthesis` en
  silencio — sin banda, sin aviso, sin consola, y sin bloquear SIGUIENTE.
- **D-08 (bloqueada):** el salto de calidad audible entre Rasalgethi y la voz del
  sistema se acepta conscientemente. No se debe "arreglar" añadiendo un aviso.
- **VOZ-04 (Fase 3, verificada en dispositivo):** al navegar, cualquier locución
  en curso se corta antes de empezar la nueva; las locuciones nunca se encolan ni
  se repiten. El bug actual es exactamente una violación de esto.
- **Regla del gesto de iOS/Android (CLAUDE.md §TTS gotchas):** todo el camino
  desde el manejador del toque hasta `.play()` es síncrono a propósito. **Ningún
  arreglo puede introducir un `await` en ese camino.** Verificado hoy: cero
  `await` en `app/composables/useVoiceAnnouncer.ts`.
- **G-01 (03-VERIFICATION.md):** el watchdog `scheduleSpeakWatchdog` del camino de
  respaldo arregla una carrera real de Chrome/Android con `cancel()`/`speak()`,
  y está verificado en un Samsung Galaxy S21/Android 15. **No tocarlo.**

## Hypothesis (principal, formulada antes de delegar)

`scheduleAudioWatchdog` se dispara aunque el clip SÍ esté sonando, y el respaldo
que lanza se solapa con el audio en curso.

Cadena de razonamiento, con las líneas exactas de
`app/composables/useVoiceAnnouncer.ts`:

1. **El cronómetro encaja.** `scheduleAudioWatchdog` (línea 84) tiene
   `delayMs = 1200`. El usuario reporta "suena un segundo". 1200 ms ≈ 1 s.
2. **La condición de disparo depende de un solo evento.** El watchdog dispara si
   `hasStarted()` sigue devolviendo `false` pasado el retardo (línea 91). El
   `hasStarted` que se le pasa es `() => audioStarted` (línea 444).
   `audioStarted` se pone a `true` **únicamente** en el listener del evento
   `playing` (líneas 267-270). Si `playing` no llega —o llega más tarde de
   1200 ms— el watchdog dispara aunque el audio esté sonando perfectamente.
3. **El respaldo NO para el audio.** `speakFallback()` (línea 366) solo llama a
   `speak()` y programa `scheduleSpeakWatchdog`. **No llama a `stopAudio()`.**
   Así que al disparar el watchdog, `speechSynthesis` arranca **encima** del clip
   que sigue reproduciéndose.
4. **En Android eso pausa el audio.** El TTS del sistema toma el foco de audio,
   lo que pausa o silencia el elemento `<audio>`. Resultado audible exactamente
   igual al reportado: voz buena ~1,2 s → corte → la misma frase empezando desde
   cero, ya con la voz del sistema.

**Predicción falsable:** si esta hipótesis es correcta, la voz que se oye tras el
corte es la **voz del sistema**, no Rasalgethi. El usuario no lo especificó — es
el primer dato a confirmar y separa esta hipótesis de la alternativa H2.

## Hipótesis alternativas (no descartadas)

- **H2 — doble `announce()`:** algo llama a `announce()` una segunda vez ~1 s
  después del toque. `announce()` hace `stopAudio()` → `src = ...` →
  `currentTime = 0` → `play()`, que es literalmente "se para y vuelve a empezar
  de cero" con la MISMA voz. Descartado parcialmente por lectura: los 5 sitios de
  llamada en `app/pages/[game]/index.vue` (líneas 153, 158, 181, 264, 298) son
  todos manejadores de toque, uno por gesto, y el único `watch` del composable
  (línea 485) es sobre `visibility`. **Pendiente:** confirmar que `useVoiceAnnouncer`
  no está instanciado dos veces (p. ej. también en `AppHeader.vue`), lo que crearía
  dos elementos `<audio>` y dos watchdogs.
- **H3 — `playing` sí llega pero tarde:** en el primer paso el clip puede venir de
  la URL estática (`staticUrlFor`) porque `prefetchAll` aún no ha terminado; con
  red lenta la descarga puede pasar de 1200 ms, así que `playing` llega tarde y el
  watchdog dispara legítimamente pero con un umbral mal calibrado. Distinta causa,
  mismo síntoma, arreglo distinto (umbral y/o señal de progreso, no solo solape).
- **H4 — el evento equivocado:** `playing` puede no ser la señal correcta en
  Android Chrome para un blob URL. Alternativas más robustas: `timeupdate`,
  `!audioEl.paused`, o `currentTime > 0`.

## Restricciones que el arreglo debe respetar

- **Cero `await`** entre el manejador del toque y `.play()`. No negociable.
- **Sin salida por consola** en el camino de producción (D-07). Si hace falta
  instrumentar para diagnosticar, que sea temporal y se quite antes del commit
  final, o que vaya detrás de una bandera de depuración explícita.
- **No tocar `scheduleSpeakWatchdog` ni `speakFallback`** más allá de lo
  estrictamente necesario: son el arreglo G-01 ya verificado en dispositivo.
  Si el arreglo pasa por que el respaldo pare el audio, el sitio correcto es el
  llamante (el watchdog de audio), no el cuerpo de `speakFallback`.
- **Cero dependencias npm nuevas.**
- **No romper los 234 tests existentes** (`npm run test`), y en particular ninguno
  de los de la Fase 3.
- El arreglo debe seguir cumpliendo el caso que el watchdog existía para cubrir
  (T-03.1-17): un clip que ni resuelve ni rechaza dejaría el paso MUDO, que es
  peor que caer al respaldo. No basta con borrar el watchdog.

## Evidence

- timestamp: 2026-08-31 — `npm run test` en local: 234/234 verde. El bug NO lo
  captura ningún test automático (los tests corren en entorno node, sin
  reproducción real de audio ni foco de audio del SO).
- timestamp: 2026-08-31 — Despliegue `5bfc10a` en Vercel: estado Ready, 20s,
  producción. El bug se reproduce contra ese despliegue, así que no es un
  artefacto del entorno de desarrollo.
- timestamp: 2026-08-31 — Verificado por grep: cero `await` y cero `console.*` en
  `useVoiceAnnouncer.ts` y `usePreloadedAudio.ts`.
- timestamp: 2026-08-31 — Servido en local: `GET /audio/setup.heroes.01.m4a` → 200
  `audio/mp4`; id inexistente → 404; cabecera `max-age=0, must-revalidate`.
- timestamp: 2026-08-31 — La asunción A1 (que `<audio>.play()` dentro del gesto no
  lo bloquee el navegador) **queda confirmada por este propio reporte**: el audio
  empieza a sonar. El problema no es el arranque, es lo que lo interrumpe.

- timestamp: 2026-08-31 — `grep -rn "useVoiceAnnouncer"` en `app/`: la única
  llamada al composable es `app/pages/[game]/index.vue:67`. `AppHeader.vue`
  solo tiene un comentario que lo menciona, no lo instancia. `grep -rln
  "speechSynthesis|new Audio("` en `app/` solo encuentra
  `useVoiceAnnouncer.ts`. **H2 (doble instanciación) queda refutada por
  lectura**, sin necesidad de dispositivo.
- timestamp: 2026-08-31 — Lectura completa de `useVoiceAnnouncer.ts` (499
  líneas) y de `app/pages/[game]/index.vue` (`onNext`/`onBack`/
  `onIndexJumpTo`/`onResumeContinue`/`onContentChangedAcknowledge`):
  `announce()` se llama exactamente una vez por gesto, siempre de forma
  síncrona en el cuerpo del manejador, nunca desde un `watch`. Confirma que
  H2 también queda descartada por el lado de los llamantes, no solo por la
  instanciación única.
- timestamp: 2026-08-31 — Lectura de `usePreloadedAudio.ts`: `prefetchAll`
  descarga los ids con `Promise.allSettled` y solo marca `audioAvailable`
  al terminar TODO el lote; `getObjectUrl` es un `Map` de módulo compartido.
  Los 9 clips existentes son ficheros pequeños, así que una precarga fría
  podría no estar lista para el paso 1 (apoya H3 parcialmente), pero el
  reporte del usuario dice que el corte se oye en **todos** los pasos 1-8,
  no solo el primero — para el paso 3 en adelante el blob del paso ya
  debería llevar varios segundos en el `Map` compartido. Esto hace a H3, por
  sí sola, una explicación incompleta: hay algo que falla de forma
  consistente más allá de la carrera de la primera precarga.
- timestamp: 2026-08-31 — Relectura de `announce()` (líneas 388-451): el
  mecanismo de la hipótesis principal es reproducible tal cual sobre el
  código, línea por línea, sin necesidad de ejecutar nada: `audioStarted`
  solo lo activa el evento `playing`; `scheduleAudioWatchdog` comprueba ESE
  flag, no el estado real del elemento; `speakFallback` nunca llama a
  `stopAudio()`. La cadena causal completa (arranca → el evento `playing`
  no se refleja en el flag a tiempo → el watchdog dispara a los 1200 ms →
  `speakFallback()` invoca `speak()` sin parar `audioEl` → en Android el
  TTS del sistema roba el foco de audio y pausa el `<audio>` a media
  reproducción → se oye "corte y reinicio") es consistente con el síntoma
  reportado en cronómetro (~1 s) sin necesitar suponer nada no verificable
  por lectura. El propio contrato de `.paused` (se pone a `false` de forma
  SÍNCRONA en cuanto se llama a `.play()`, antes de que suene nada) explica
  por qué el código no usó `!audioEl.paused` como señal — habría hecho al
  watchdog inútil para el caso T-03.1-17 que sí tiene que cubrir— y por qué
  la señal de sustitución correcta es `audioEl.currentTime > 0` (solo
  avanza cuando de verdad se están decodificando fotogramas, es decir,
  cuando el usuario ya está oyendo sonido), no el booleano derivado en
  exclusiva del evento `playing`.

## Resolution

root_cause: En `useVoiceAnnouncer.ts` (`announce()`), el flag `audioStarted`
que gobierna `hasStarted()` del watchdog de audio (`scheduleAudioWatchdog`,
delayMs=1200) solo se activaba con el evento `playing` del `<audio>`, señal
frágil en Android/Chrome para un elemento con `src` de tipo blob: puede no
reflejarse a tiempo aunque el clip esté sonando de forma audible. Cuando eso
ocurría, el watchdog llamaba a `speakFallback()` sin que nadie parase antes
el `<audio>` — `speechSynthesis.speak()` arrancaba con el clip todavía vivo,
y en Android el TTS del sistema toma el foco de audio y pausa el elemento a
media reproducción. Resultado audible: exactamente "suena ~1s, se corta, la
frase reinicia desde cero con otra voz".
fix: Dos funciones puras nuevas, exportadas (mismo patrón que
`scheduleAudioWatchdog`/`scheduleSpeakWatchdog`), y su cableado en
`announce()` — sin tocar `speakFallback` ni `scheduleAudioWatchdog`
(G-01/03.1-05 verificados en dispositivo, fuera de límites del arreglo):
(1) `hasAudioStarted(audioStarted, audioEl)` añade `audioEl.currentTime > 0`
como señal adicional de arranque real, independiente de si el evento
`playing` llegó a tiempo — ataca la causa (evento frágil en Android) en vez
de solo el síntoma; deliberadamente NO usa `!audioEl.paused` porque
HTMLMediaElement lo pone a `false` de forma síncrona en cuanto se llama a
`.play()`, mucho antes de que exista sonido real, lo que habría inutilizado
el watchdog para el caso T-03.1-17 que debe seguir cubriendo. (2)
`composeAudioFallback(stopAudio, speakFallback)` compone el orden correcto —
`stopAudio()` SIEMPRE antes que `speakFallback()` — y sustituye a las dos
llamadas directas a `speakFallback` (el `.catch()` de `.play()` y el
`onStall` del watchdog), como defensa en profundidad: si el watchdog llegara
a disparar alguna vez con el clip aún sonando, ya no puede solaparse con la
síntesis. Cero `await` nuevos, cero `console.*`, cero dependencias npm.
verification: Autoverificado — `npm run test` 241/241 en verde (234
existentes + 7 nuevos: 4 para `hasAudioStarted`, 3 para
`composeAudioFallback`, incluida una con un `<audio>` falso que reproduce el
defecto exacto del bug). NO se ha podido verificar en el dispositivo Android
real (foco de audio del SO no reproducible en vitest/CI) — pendiente de
checkpoint human-verify.
files_changed:
  - app/composables/useVoiceAnnouncer.ts
  - app/composables/__tests__/useVoiceAnnouncer.test.ts

## Eliminated

- hypothesis: "Fallo del despliegue" — refutado: el despliegue `5bfc10a` está en
  estado Ready y sirve los ficheros correctamente.
- hypothesis: "El autoplay de Android bloquea `<audio>.play()` dentro del gesto
  (asunción A1 rota)" — refutado: el clip arranca y se oye.
- hypothesis: "Es la transición de diseño de clip a respaldo en el paso 9" —
  refutado: el usuario reporta el corte en los pasos que SÍ tienen clip.
- hypothesis: "H2 — `useVoiceAnnouncer` instanciado dos veces (p. ej. también
  en `AppHeader.vue`), creando dos `<audio>` y dos watchdogs" — refutado por
  lectura: única llamada al composable en `app/pages/[game]/index.vue:67`;
  único fichero que usa `speechSynthesis`/`new Audio()` es
  `useVoiceAnnouncer.ts`; los cinco sitios de llamada a `announce()` son
  manejadores de toque síncronos, ninguno detrás de un `watch`.

## Current Focus

reasoning_checkpoint:
  hypothesis: "En `announce()` (useVoiceAnnouncer.ts), el flag `audioStarted` que gobierna `hasStarted()` del watchdog de audio solo lo activa el evento `playing`, que es una señal frágil en Android/Chrome para `<audio>` con `src` de tipo blob: puede no reflejarse a tiempo (o en absoluto) aunque el elemento SÍ esté produciendo sonido audible. Cuando eso ocurre, `scheduleAudioWatchdog` dispara `speakFallback()` a los 1200 ms sin que nadie llame a `stopAudio()` primero, así que `speechSynthesis.speak()` arranca con el clip todavía sonando; en Android el TTS del sistema toma el foco de audio y pausa el `<audio>` a media reproducción — exactamente 'suena ~1s, se corta, la frase reinicia desde cero con otra voz'."
  confirming_evidence:
    - "Cronómetro: delayMs=1200 del watchdog coincide con el '~1 segundo' reportado por el usuario, sin necesidad de suponer nada más."
    - "Lectura completa y literal del código: audioStarted (l.256) solo se pone a true en el listener de 'playing' (l.267-270); scheduleAudioWatchdog (l.84-103) solo consulta ese flag; speakFallback (l.364-383) llama a speak() y jamás a stopAudio()."
    - "H2 (doble instanciación / doble llamada) queda refutado por grep + lectura de los 5 call-sites de announce(): descarta la explicación alternativa más simple para 'se para y vuelve a empezar de cero'."
    - "El contrato de HTMLMediaElement explica por qué NO se puede usar !audioEl.paused como sustituto (se pone a false de forma síncrona en cuanto se llama a .play(), antes de que exista sonido real), lo que hace de audioEl.currentTime > 0 la señal correcta y no antes considerada."
  falsification_test: "Si en el dispositivo se confirma que la voz oída tras el corte es Rasalgethi (no la del sistema) y/o que el corte ocurre con audioSrc undefined (camino speakFallback puro, sin audio de por medio), la hipótesis queda refutada — habría que investigar el camino de solo-síntesis en su lugar. Pendiente de una pasada del usuario en el móvil tras aplicar el arreglo, porque no hay forma de reproducir foco de audio de Android en vitest/CI."
  fix_rationale: "El arreglo no toca scheduleAudioWatchdog ni speakFallback (G-01 verificado, fuera de límites) — cambia solo lo que announce() les pasa como argumentos: (1) hasStarted ahora también acepta audioEl.currentTime > 0 como señal de arranque real, independiente de si el evento 'playing' llegó o no, lo que ataca la causa (H4) en vez de solo el síntoma; (2) el callback de onStall pasa primero por stopAudio() antes de speakFallback(), así que si el watchdog SÍ dispara alguna vez (T-03.1-17, stall genuino), el respaldo nunca se solapa con un clip que pudiera seguir sonando — defensa en profundidad sobre la causa raíz exacta que describe el síntoma (TTS arrancando encima de audio en curso)."
  blind_spots: "No hay forma de confirmar en CI/vitest que en Android real esto elimina el corte — el foco de audio del SO y el comportamiento real de blob: + m4a con `playing` no son reproducibles fuera de un dispositivo. Tampoco se ha confirmado directamente (aún) si la voz oída tras el corte era del sistema o Rasalgethi; se infiere de la lectura del código, no de una traza en vivo. Sigue pendiente una pasada en el móvil del usuario para cerrar el ciclo de verificación."
hypothesis: (ver reasoning_checkpoint arriba, confirmada por lectura; root_cause en Resolution)
test: Arreglo aplicado (hasAudioStarted + composeAudioFallback), 241/241 tests en verde. Pendiente: pasada del usuario en el móvil (Samsung, mismo SO que la tablet) sobre el mismo despliegue/reproducción original (pasos 1-8 de Normal).
expecting: En el dispositivo, el usuario deja de oír el corte en los pasos 1-8 y el clip Rasalgethi suena completo, sin cortes ni reinicio.
next_action: Checkpoint human-verify — pedir al usuario que despliegue este cambio (o pruebe en local vía túnel/red local si prefiere no desplegar aún) y repita la reproducción exacta de los pasos 1-8 en el Samsung, y que reporte si el corte desaparece.
