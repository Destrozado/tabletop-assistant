// app/composables/useVoiceAnnouncer.ts
// La voz NO es motor: no toca session/cursor/round/context, no importa
// ~~/engine/* salvo tipos (import type), no relee content/marvel-champions.json
// (haría cortocircuito a resolveText() y se saltaría la resolución de
// variantes), y no llama al composable reactivo de almacenamiento persistente
// directamente (pasa siempre por usePersistedSession, la única costura de
// localStorage de la app).
//
// Plan 03.1-05: la locución tiene ahora DOS fuentes. El audio pregenerado
// (Rasalgethi) es la PRIMARIA — VOZ-07/VOZ-08 — y todo el cuerpo de la
// Fase 3 (`speakFallback`, el watchdog G-01, la detección de voz española)
// sigue intacto por debajo como respaldo silencioso (D-07/D-08). El
// watchdog G-01 sigue atado EXCLUSIVAMENTE a `speakFallback`: el camino de
// `<audio>` no tiene la carrera cancel()/speak() de `speechSynthesis`.
import { computed, onMounted, ref, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { tryOnScopeDispose, useDocumentVisibility, useSpeechSynthesis } from '@vueuse/core'
import { usePersistedSession } from './usePersistedSession'
import { usePreloadedAudio } from './usePreloadedAudio'
import type { RuntimeStepNode, TextBlock } from '~~/engine/types'

export type VoiceState = 'on' | 'muted' | 'unavailable'

// D-47: la indisponibilidad gana sobre la preferencia. `available === null`
// (detección aún sin resolver, plan 03-03) es optimista por contrato del
// UI-SPEC: nunca se pinta un icono atenuado que parpadee en cada carga.
export function resolveVoiceState(prefEnabled: boolean, available: boolean | null): VoiceState {
  if (available === false) return 'unavailable'
  return prefEnabled ? 'on' : 'muted'
}

// Las cuatro guardas de announce(): D-40 (solo hablan los pasos kind:'step'),
// estado 'on' (D-45/D-47), frase no vacía (WR-01) y síntesis soportada
// (VOZ-06) — SALVO que haya audio pregenerado (VOZ-07: la locución no puede
// depender de las voces instaladas en el sistema). `hasAudio` es OPCIONAL y
// por defecto `false` para que las llamadas y los tests existentes de la
// Fase 3 (sin este campo) sigan comportándose exactamente igual.
export function shouldAnnounce(input: {
  kind: 'step' | 'summary' | null
  state: VoiceState
  line: string
  isSupported: boolean
  hasAudio?: boolean
}): boolean {
  return input.kind === 'step'
    && input.state === 'on'
    && input.line.length > 0
    && (input.hasAudio === true || input.isSupported === true)
}

// resolveEffectiveAvailability (plan 03.1-05, D-07/D-08): la disponibilidad
// que gobierna voiceState/showVoiceUnavailableNotice ya no es solo la
// detección de voz del sistema — es la combinación de las DOS fuentes.
// Consecuencias, ambas deliberadas:
// (a) con audio pregenerado disponible (`audioAvailable === true`), el
//     control de silencio NUNCA cae en 'unavailable', así que el usuario
//     siempre puede callar y reactivar la voz (criterio 1 del ROADMAP);
// (b) la banda de "sin voz en español" de la Fase 3 solo aparece cuando
//     fallan LAS DOS fuentes — exactamente el caso para el que se diseñó.
//     Pintarla mientras suena Rasalgethi sería mentir y violaría D-07
//     (nada de bandas cuando el respaldo silencioso ya está funcionando).
// `audioAvailable === null` (precarga aún en vuelo, plan 03.1-04) se
// resuelve a `null`: mismo optimismo de D-47, la banda no debe parpadear
// mientras la precarga todavía puede completarse.
export function resolveEffectiveAvailability(
  audioAvailable: boolean | null,
  spanishVoiceAvailable: boolean | null,
): boolean | null {
  if (audioAvailable === true) return true
  if (audioAvailable === null) return null
  return spanishVoiceAvailable
}

// scheduleAudioWatchdog (plan 03.1-05, T-03.1-17): cubre el caso en que
// `.play()` ni resuelve ni rechaza — un clip que no llega por una red
// presente pero inútil. Sin esto ese paso se quedaría MUDO, peor que caer al
// respaldo. Calcado en forma a scheduleSpeakWatchdog (mismo patrón de
// función de cancelación), pero para el camino de audio: si pasado el
// retardo `hasStarted()` sigue siendo `false`, invoca `onStall()` una única
// vez. El respaldo disparado desde aquí ya no está dentro del gesto del
// usuario y por tanto puede ser descartado en iOS: es una mejora
// oportunista, no una garantía, y jamás debe bloquear nada ni propagar una
// excepción de `onStall`.
export function scheduleAudioWatchdog(
  hasStarted: () => boolean,
  onStall: () => void,
  delayMs = 1200,
): () => void {
  const timer = setTimeout(() => {
    if (hasStarted()) return
    try {
      onStall()
    }
    catch {
      // Igual que scheduleSpeakWatchdog: un throw aquí jamás debe romper
      // next()/prev() (VOZ-06).
    }
  }, delayMs)

  return function cancel(): void {
    clearTimeout(timer)
  }
}

// hasAudioStarted (audio-corta-y-reinicia): la señal que consulta el
// watchdog de arriba (`hasStarted`) ya NO depende en exclusiva de que el
// evento `playing` del `<audio>` haya llegado a tiempo. En Android/Chrome ese
// evento puede no reflejarse a tiempo para un elemento con `src` de tipo
// blob aunque el clip SÍ esté sonando de forma audible — el bug reportado
// ("suena ~1s, se corta, la frase reinicia desde cero con otra voz") encaja
// exactamente con ese falso negativo: el watchdog disparaba el respaldo de
// síntesis sobre un clip que en realidad seguía vivo.
// `audioEl.currentTime` es la señal de sustitución: solo avanza cuando de
// verdad hay fotogramas decodificándose, es decir, cuando ya existe sonido
// real. Deliberadamente NO se usa `!audioEl.paused`: el propio contrato de
// HTMLMediaElement lo pone a `false` de forma SÍNCRONA en cuanto se llama a
// `.play()`, mucho antes de que exista ningún sonido — usarlo habría hecho
// que el watchdog nunca disparase, ni siquiera para el caso T-03.1-17 que
// tiene que seguir cubriendo (un clip que ni arranca ni falla nunca).
export function hasAudioStarted(
  audioStarted: boolean,
  audioEl: { currentTime: number } | null,
): boolean {
  return audioStarted || (audioEl !== null && audioEl.currentTime > 0)
}

// composeAudioFallback (audio-corta-y-reinicia): el defecto real del bug —
// el respaldo de síntesis (`speakFallback`) podía arrancar con el clip
// pregenerado todavía sonando, porque nada llamaba a `stopAudio()` primero.
// En Android eso hace que `speechSynthesis` tome el foco de audio y pause el
// `<audio>` a media reproducción: exactamente "suena ~1s, se corta, la
// frase reinicia desde cero". El arreglo NO toca `speakFallback` ni
// `scheduleAudioWatchdog` (G-01/03.1-05 ya verificados en dispositivo, fuera
// de límites) — compone el orden correcto en el sitio llamante. El contrato
// que este export protege es exactamente ese orden: `stopAudio` SIEMPRE
// antes que `speakFallback`, nunca al revés ni en paralelo.
export function composeAudioFallback(stopAudio: () => void, speakFallback: () => void): () => void {
  return function fallbackFromAudio(): void {
    stopAudio()
    speakFallback()
  }
}

// 03-RESEARCH.md §Pitfall 3: en Android, getVoices() puede listar una entrada
// es-* genérica aunque el paquete de voz en español no esté descargado. NO
// construir un detector más fino (por ejemplo, exigir un nombre de voz
// concreto o `localService === true`): sería adivinar sobre una API que no
// expone esa información de forma fiable. La banda de aviso (Task 2) ya cubre
// ese caso con una copia deliberadamente genérica, así que un falso negativo
// aquí es aceptable por diseño.
export function hasSpanishVoice(voices: ReadonlyArray<{ lang: string }>): boolean {
  return voices.some(voice => voice.lang.toLowerCase().startsWith('es'))
}

// Carrera acotada en el tiempo (T-03-09): si el evento que anuncia voces
// cargadas no llega nunca (03-RESEARCH.md §Pitfall 2, algunas versiones de
// Safari), el `setTimeout` resuelve igualmente la detección. `settled`
// garantiza que `onResult` se llame como mucho una vez, aunque el evento y el
// temporizador se disparen los dos.
//
// WR-01: devuelve una función de cancelación. Ni el listener `voiceschanged`
// (registrado en el `window.speechSynthesis` de larga vida) ni el `setTimeout`
// de respaldo se limpian solos si nadie llama a esta función antes de que la
// carrera resuelva — el llamador (useVoiceAnnouncer) es responsable de
// invocarla al desmontar/desechar el scope.
export function detectSpanishVoice(
  synth: SpeechSynthesis | undefined,
  onResult: (available: boolean) => void,
  timeoutMs = 2000,
): () => void {
  if (!synth) {
    // isSupported === false: mismo estado y misma banda que "sin voz
    // española" — la app no puede distinguir con fiabilidad la causa, y
    // ambas producen silencio total desde el punto de vista del usuario.
    onResult(false)
    return () => {}
  }

  let settled = false
  function finish(voices: ReadonlyArray<{ lang: string }>): void {
    if (settled) return
    settled = true
    onResult(hasSpanishVoice(voices))
  }

  const initialVoices = synth.getVoices()
  if (initialVoices.length > 0) {
    finish(initialVoices)
    return () => {}
  }

  const onVoicesChanged = (): void => finish(synth.getVoices())
  synth.addEventListener('voiceschanged', onVoicesChanged, { once: true })
  const timer = setTimeout(() => finish(synth.getVoices()), timeoutMs)

  return function cancel(): void {
    settled = true
    clearTimeout(timer)
    synth.removeEventListener('voiceschanged', onVoicesChanged)
  }
}

// G-01 (03-VERIFICATION.md): `useSpeechSynthesis().speak()` de @vueuse/core
// es literalmente `synth.cancel(); synth.speak(utterance.value)`, sincrono y
// consecutivo (confirmado leyendo node_modules/@vueuse/core/dist/index.js).
// En Chrome/Android, `cancel()` se procesa de forma asincrona y puede
// descartar el utterance que `speak()` acaba de encolar en el mismo tick,
// sin lanzar ningun error — la locucion del paso destino nunca arranca.
// Cuando no hay locucion en curso, `cancel()` es un no-op y `speak()`
// sobrevive, lo que explica que el fallo solo aparezca al pulsar SIGUIENTE
// a mitad de frase, nunca esperando a que termine.
//
// El intento sincrono en el manejador de toque NO puede diferirse: iOS
// Safari exige que `speak()` se invoque de forma sincrona dentro del gesto
// del usuario (CLAUDE.md §TTS gotchas), y ese cableado ya es un entregable
// probado en dispositivo real (plan 03-02). Este watchdog corre DESPUES del
// intento sincrono, nunca en su lugar.
//
// `getStatus` debe leer el mismo `status` reactivo que expone
// `useSpeechSynthesis` (su `bindEventsForUtterance` interno ya asigna
// `utterance.onstart -> status.value = 'play'`); comprobarlo aqui compone
// con ese cableado en vez de sobrescribir `onstart` (que rompería
// `isPlaying`/`status` de VueUse). Si `status` sigue en `'init'` tras el
// retraso, el navegador nunca disparo `onstart` para este intento — la
// locucion se perdio (la carrera de G-01) — y se reintenta `speak()` UNA
// sola vez. Si `status` ya avanzo a `'play'`/`'pause'`/`'end'`, el intento
// sincrono si arranco (camino de iOS/desktop/Chrome sin la carrera) y esta
// funcion es un no-op.
//
// Devuelve una funcion de cancelacion (mismo patron que `detectSpanishVoice`
// arriba): el llamador debe invocarla si programa un nuevo intento antes de
// que el retraso expire (nueva navegacion), al silenciar, o al desechar el
// scope — un reintento tardio de un paso ya abandonado violaria VOZ-04
// (nunca se encola ni repite) igual que la carrera original.
export function scheduleSpeakWatchdog(
  speak: () => void,
  getStatus: () => string,
  delayMs = 200,
): () => void {
  const timer = setTimeout(() => {
    if (getStatus() !== 'init') return
    try {
      speak()
    }
    catch {
      // Misma guarda que announce(): un throw aqui jamas debe romper
      // next()/prev() (VOZ-06).
    }
  }, delayMs)

  return function cancel(): void {
    clearTimeout(timer)
  }
}

export function useVoiceAnnouncer(
  currentNode: ComputedRef<RuntimeStepNode | null>,
  currentText: ComputedRef<TextBlock>,
  currentAudioId: ComputedRef<string | null>,
) {
  const { loadVoicePreference, saveVoicePreference } = usePersistedSession()
  // Plan 03.1-05: capa de audio pregenerado (plan 03.1-04). `getObjectUrl`
  // es SÍNCRONA (Pitfall 1) — la única lectura permitida dentro del camino
  // que va del toque a `.play()`.
  const { getObjectUrl, staticUrlFor, audioAvailable } = usePreloadedAudio()

  // Única fuente de la frase locutada — nunca currentText.value.text.
  const spokenLine = computed(() => currentText.value.speech ?? '')

  // Instanciado UNA SOLA VEZ, con el getter reactivo: speak() no recibe
  // argumentos y relee spokenLine en cada llamada. Solo `lang`: 03-CONTEXT.md
  // §Deferred descarta el selector de voz — que el sistema elija su voz
  // española por defecto.
  const { speak, stop, isSupported, status } = useSpeechSynthesis(spokenLine, { lang: 'es-ES' })

  // G-01 (03-VERIFICATION.md): un unico watchdog vivo a la vez, cancelable
  // desde announce()/silence()/dispose. `cancelWatchdog` empieza como no-op
  // para que clearPendingRetry() sea siempre segura de llamar aunque nunca
  // se haya programado ningun watchdog todavia.
  let cancelWatchdog: () => void = () => {}

  function clearPendingRetry(): void {
    cancelWatchdog()
    cancelWatchdog = () => {}
  }

  tryOnScopeDispose(clearPendingRetry)

  // Plan 03.1-05: elemento <audio> ÚNICO y reutilizado (no un pool: solo
  // suena una locución a la vez, VOZ-04). Creado en onMounted, nunca en el
  // cuerpo del setup — esta página prerrenderiza (`nuxt generate`) y `Audio`
  // no existe durante el build. `audioStarted` la lee scheduleAudioWatchdog
  // (T-03.1-17: clip que ni arranca ni falla).
  let audioEl: HTMLAudioElement | null = null
  let audioStarted = false
  let cancelAudioWatchdog: () => void = () => {}

  function clearPendingAudioWatchdog(): void {
    cancelAudioWatchdog()
    cancelAudioWatchdog = () => {}
  }

  onMounted(() => {
    const el = new Audio()
    el.preload = 'auto'
    const onPlaying = (): void => {
      audioStarted = true
    }
    el.addEventListener('playing', onPlaying)
    audioEl = el
    // WR-01: mismo patrón que el resto del fichero — tryOnScopeDispose, no
    // onUnmounted, para poder desechar el recurso desde un EffectScope
    // desnudo (tests) igual que un componente real.
    tryOnScopeDispose(() => {
      clearPendingAudioWatchdog()
      try {
        el.pause()
      }
      catch {
        // Pausar un elemento sin fuente cargada puede lanzar en algunos
        // navegadores: nunca debe romper el desmontaje.
      }
      el.removeEventListener('playing', onPlaying)
      el.src = ''
      audioEl = null
    })
  })

  // stopAudio() (VOZ-04/D-45): corte síncrono del elemento de audio y de
  // cualquier watchdog de audio pendiente. Se llama al principio de
  // announce() (navegar corta lo que hubiera sonando, decida lo que decida
  // la guarda) y desde silence() (corte inmediato al silenciar).
  function stopAudio(): void {
    clearPendingAudioWatchdog()
    if (!audioEl) return
    try {
      audioEl.pause()
    }
    catch {
      // Mismo talante defensivo que el resto del fichero: un fallo al
      // pausar nunca debe romper next()/prev() (VOZ-06).
    }
  }

  // D-47: valor optimista hasta que se lee el almacenamiento. Cargado en
  // onMounted (guard de cliente obligatorio), nunca en el cuerpo del setup.
  const prefEnabled = ref(true)
  onMounted(() => {
    prefEnabled.value = loadVoicePreference()
  })

  // Detección de voz española (VOZ-05/VOZ-06): null es el estado real
  // "detección sin resolver" (pinta optimista 'on', UI-SPEC §Layout 1), y solo
  // cambia una vez cuando detectSpanishVoice resuelve su carrera acotada.
  // Plan 03.1-05: renombrado de `available` a `spanishVoiceAvailable` — ya
  // no es LA disponibilidad, es una de las dos fuentes que resuelve
  // `resolveEffectiveAvailability` más abajo. Su lógica y su carrera acotada
  // NO se tocan.
  const spanishVoiceAvailable = ref<boolean | null>(null)
  onMounted(() => {
    // WR-01: si el componente se desmonta (navegación antes de que la carrera
    // de 2s resuelva), `tryOnScopeDispose` cancela el listener `voiceschanged`
    // y el `setTimeout` de respaldo. `tryOnScopeDispose` (no `onUnmounted`) se
    // usa a propósito: no asume que siempre hay una instancia de componente
    // activa, solo un `EffectScope` — igual que hace @vueuse/core
    // internamente, y necesario para poder testear este composable dentro de
    // un `effectScope()` desnudo (WR-03) sin montar un componente real.
    const cancelDetection = detectSpanishVoice(
      typeof window === 'undefined' ? undefined : window.speechSynthesis,
      (result) => {
        spanishVoiceAvailable.value = result
      },
    )
    tryOnScopeDispose(cancelDetection)
  })

  // Plan 03.1-05 (D-07/D-08): la disponibilidad efectiva combina las DOS
  // fuentes — ver el comentario-contrato de resolveEffectiveAvailability.
  // Con audio pregenerado disponible, el control de silencio nunca cae en
  // 'unavailable' (criterio 1); la banda de "sin voz en español" solo
  // aparece si fallan las dos fuentes.
  const available = computed<boolean | null>(() =>
    resolveEffectiveAvailability(audioAvailable.value, spanishVoiceAvailable.value))

  const voiceState = computed<VoiceState>(() => resolveVoiceState(prefEnabled.value, available.value))

  // D-50: descarte de la banda como estado de sesión, nunca persistido — no
  // pasa por usePersistedSession ni añade ninguna clave de localStorage. Si en
  // una sesión futura el dispositivo ya tiene voz española, el aviso
  // simplemente no vuelve a salir.
  const noticeDismissed = ref(false)
  function dismissNotice(): void {
    noticeDismissed.value = true
  }
  const showVoiceUnavailableNotice = computed(() => available.value === false && !noticeDismissed.value)

  // speakFallback() (Fase 3, G-01): EXTRAÍDO tal cual del cuerpo previo de
  // announce() — ni una línea de esta lógica cambia, es el arreglo G-01 ya
  // verificado en dispositivo real (Samsung Galaxy S21/Android 15). Es el
  // respaldo de D-07/D-08: se llama cuando no hay audio pregenerado y desde
  // el `.catch()`/watchdog del camino de audio (rechazo o clip que no
  // arranca = ausencia, nunca un error visible).
  function speakFallback(): void {
    try {
      speak()
    }
    catch {
      // El emparejamiento cancelar/hablar de VueUse puede fallar en iOS justo
      // tras terminar la locución anterior (03-RESEARCH.md). VOZ-06 exige que
      // esto jamás rompa next()/prev().
      return
    }
    // G-01: synth.cancel()+synth.speak() de VueUse es sincrono; en Chrome/
    // Android cancel() se resuelve de forma asincrona y puede descartar el
    // utterance que speak() acaba de encolar en el mismo tick, sin lanzar
    // error — la locucion nunca arranca. El intento de arriba no puede
    // diferirse (iOS exige speak() dentro del gesto, CLAUDE.md §TTS
    // gotchas); scheduleSpeakWatchdog corre DESPUES de el y solo reintenta
    // si `status` (el mismo ref que expone useSpeechSynthesis, ya cableado
    // por su propio onstart interno) nunca salio de 'init'.
    cancelWatchdog = scheduleSpeakWatchdog(speak, () => status.value)
  }

  // audio-corta-y-reinicia: único punto por el que el camino de `<audio>`
  // cae al respaldo de síntesis — desde el `.catch()` de `.play()` y desde
  // `scheduleAudioWatchdog` (T-03.1-17). NO toca speakFallback ni
  // scheduleAudioWatchdog (G-01/03.1-05 verificados, fuera de límites de
  // este arreglo): `composeAudioFallback` (función pura, exportada para
  // poder testearla igual que scheduleAudioWatchdog/scheduleSpeakWatchdog)
  // compone `stopAudio()` delante de `speakFallback()`. `stopAudio()` ya es
  // un no-op seguro cuando el elemento nunca llegó a sonar (rechazo de
  // `.play()`), así que envolver también ese camino no cambia su
  // comportamiento — el caso que sí importa es el watchdog: si dispara con
  // el clip realmente sonando (evento `playing` no reflejado a tiempo en
  // Android, ver `hasAudioStarted` más abajo), `speechSynthesis.speak()` ya
  // NO arranca sobre un `<audio>` vivo. En Android eso es justo lo que roba
  // el foco de audio y pausa el clip a media reproducción — el síntoma
  // exacto de "suena ~1s, se corta, reinicia desde cero con otra voz".
  const fallbackFromAudio = composeAudioFallback(stopAudio, speakFallback)

  // announce() (plan 03.1-05, VOZ-07/VOZ-08): TODO síncrono hasta la llamada
  // a `.play()` — prohibido cualquier `await` en este camino (Pitfall 1,
  // CLAUDE.md §TTS gotchas, extendido de speak() a <audio>.play()).
  function announce(): void {
    const kind = currentNode.value?.step.kind ?? null
    const audioId = currentAudioId.value
    // Primer escalón: blob ya precargado (lectura SÍNCRONA de un Map,
    // usePreloadedAudio.ts). Segundo escalón: si la precarga todavía no
    // tiene el blob pero hay red, la URL estática directa suena mucho mejor
    // que caer a la voz del sistema — el elemento de audio la resuelve por
    // su cuenta de forma asíncrona al reproducir, sin que este composable
    // tenga que esperar nada.
    const objectUrl = audioId ? getObjectUrl(audioId) : undefined
    const audioSrc = objectUrl ?? (audioId ? staticUrlFor(audioId) : undefined)
    const willAnnounce = shouldAnnounce({
      kind,
      state: voiceState.value,
      line: spokenLine.value,
      isSupported: isSupported.value,
      hasAudio: audioSrc !== undefined,
    })
    // G-01/VOZ-04: cualquier watchdog pendiente (de voz o de audio) de un
    // announce() anterior queda obsoleto en cuanto se llama a announce() de
    // nuevo, y navegar corta lo que hubiera sonando — decida lo que decida
    // la guarda de abajo.
    clearPendingRetry()
    stopAudio()
    if (!willAnnounce) return

    if (audioSrc !== undefined && audioEl) {
      // La fuente cambia de motor (audio pregenerado en vez de síntesis):
      // cortar cualquier utterance en curso para que no se solapen.
      try {
        stop()
      }
      catch {
        // Misma landmine de TypeError que en silence() cuando la síntesis
        // no está soportada.
      }
      audioEl.src = audioSrc
      try {
        // Necesario para re-locutar el mismo paso (p. ej. tras «Continuar»
        // de una reanudación) — sin esto un `src` idéntico no reinicia
        // la reproducción.
        audioEl.currentTime = 0
      }
      catch {
        // Un elemento recién creado sin metadata cargada puede lanzar aquí
        // en algunos navegadores: no debe romper next()/prev() (VOZ-06).
      }
      audioStarted = false
      // D-07: un rechazo de reproducción (autoplay bloqueado, fichero
      // ausente, fallo de red) es una AUSENCIA, no un error — cae al
      // respaldo en silencio, sin salida por consola, sin banda.
      audioEl.play().catch(fallbackFromAudio)
      // T-03.1-17: el clip puede no rechazar NI resolver nunca (red
      // presente pero inútil). Pasado el retardo sin `playing`, cae al
      // respaldo — ya fuera del gesto, por eso es una mejora oportunista
      // (puede descartarse en iOS) y nunca una garantía.
      //
      // audio-corta-y-reinicia: `hasAudioStarted` (función pura, ver más
      // abajo) ya NO depende en exclusiva del evento `playing` (línea
      // `audioStarted = true` en onPlaying, arriba). En Android/Chrome ese
      // evento puede no reflejarse a tiempo para un `<audio>` con `src` de
      // tipo blob aunque el clip SÍ esté sonando.
      cancelAudioWatchdog = scheduleAudioWatchdog(
        () => hasAudioStarted(audioStarted, audioEl),
        fallbackFromAudio,
      )
      return
    }

    // Sin audio pregenerado disponible (id ausente, precarga sin terminar
    // y sin red, o audioEl aún no montado) — mismo camino de la Fase 3.
    speakFallback()
  }

  function silence(): void {
    // VOZ-04/D-45: corte inmediato de la locución, venga de donde venga.
    stopAudio()
    // G-01: si habia un watchdog pendiente (locucion que aun no habia
    // arrancado), silenciar no debe dejarlo vivo para que reaparezca la voz
    // mas tarde por su cuenta — D-45 exige corte inmediato, sin excepciones.
    clearPendingRetry()
    if (!isSupported.value) return
    try {
      stop()
    }
    catch {
      // Misma landmine de TypeError que speak() sin síntesis soportada.
    }
  }

  function toggle(): void {
    if (voiceState.value === 'unavailable') return
    prefEnabled.value = !prefEnabled.value
    saveVoicePreference(prefEnabled.value)
    // D-45: corte instantáneo al silenciar, sin dejar terminar la frase. Al
    // reactivar no se relocuta el paso actual (D-42/D-44): la siguiente
    // locución ocurre en el siguiente disparador natural.
    if (!prefEnabled.value) silence()
  }

  // D-45: corte por visibilidad. Legítimo pese a D-42 (que solo prohíbe
  // disparar speak() desde un watch, no stop()). No relocuta al volver a
  // visible. useWakeLock (plan 03-04) trae su propio listener interno;
  // duplicar un visibilitychange manual es justo el antipatrón que D-45
  // señala.
  const visibility = useDocumentVisibility()
  watch(visibility, (value) => {
    if (value === 'hidden') silence()
  })

  return {
    voiceState,
    announce,
    toggle,
    silence,
    available,
    isSupported,
    showVoiceUnavailableNotice,
    dismissNotice,
  }
}
