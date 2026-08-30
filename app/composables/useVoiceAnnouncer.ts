// app/composables/useVoiceAnnouncer.ts
// La voz NO es motor: no toca session/cursor/round/context, no importa
// ~~/engine/* salvo tipos (import type), no relee content/marvel-champions.json
// (haría cortocircuito a resolveText() y se saltaría la resolución de
// variantes), y no llama al composable reactivo de almacenamiento persistente
// directamente (pasa siempre por usePersistedSession, la única costura de
// localStorage de la app).
import { computed, onMounted, ref, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { tryOnScopeDispose, useDocumentVisibility, useSpeechSynthesis } from '@vueuse/core'
import { usePersistedSession } from './usePersistedSession'
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
// (VOZ-06).
export function shouldAnnounce(input: {
  kind: 'step' | 'summary' | null
  state: VoiceState
  line: string
  isSupported: boolean
}): boolean {
  return input.kind === 'step'
    && input.state === 'on'
    && input.line.length > 0
    && input.isSupported === true
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
) {
  const { loadVoicePreference, saveVoicePreference } = usePersistedSession()

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

  // D-47: valor optimista hasta que se lee el almacenamiento. Cargado en
  // onMounted (guard de cliente obligatorio), nunca en el cuerpo del setup.
  const prefEnabled = ref(true)
  onMounted(() => {
    prefEnabled.value = loadVoicePreference()
  })

  // Detección de voz española (VOZ-05/VOZ-06): null es el estado real
  // "detección sin resolver" (pinta optimista 'on', UI-SPEC §Layout 1), y solo
  // cambia una vez cuando detectSpanishVoice resuelve su carrera acotada.
  const available = ref<boolean | null>(null)
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
        available.value = result
      },
    )
    tryOnScopeDispose(cancelDetection)
  })

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

  function announce(): void {
    const kind = currentNode.value?.step.kind ?? null
    const willAnnounce = shouldAnnounce({
      kind,
      state: voiceState.value,
      line: spokenLine.value,
      isSupported: isSupported.value,
    })
    // G-01: cualquier watchdog pendiente de un announce() anterior queda
    // obsoleto en cuanto se llama a announce() de nuevo — un reintento
    // tardio de un paso ya abandonado violaria VOZ-04 (encolado/repetido)
    // igual que la carrera original.
    clearPendingRetry()
    if (!willAnnounce) return
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

  function silence(): void {
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
