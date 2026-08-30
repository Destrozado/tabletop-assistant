// app/composables/useVoiceAnnouncer.ts
// La voz NO es motor: no toca session/cursor/round/context, no importa
// ~~/engine/* salvo tipos (import type), no relee content/marvel-champions.json
// (haría cortocircuito a resolveText() y se saltaría la resolución de
// variantes), y no llama a useLocalStorage directamente (pasa siempre por
// usePersistedSession, la única costura de localStorage de la app).
import { computed, onMounted, ref, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { useDocumentVisibility, useSpeechSynthesis } from '@vueuse/core'
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
  const { speak, stop, isSupported } = useSpeechSynthesis(spokenLine, { lang: 'es-ES' })

  // D-47: valor optimista hasta que se lee el almacenamiento. Cargado en
  // onMounted (guard de cliente obligatorio), nunca en el cuerpo del setup.
  const prefEnabled = ref(true)
  onMounted(() => {
    prefEnabled.value = loadVoicePreference()
  })

  // Detección de voz española (plan 03-03): el ref existe y ya alimenta la
  // rama 'unavailable'. null es el estado real "detección sin resolver", no
  // un stub de decisión.
  const available = ref<boolean | null>(null)

  const voiceState = computed<VoiceState>(() => resolveVoiceState(prefEnabled.value, available.value))

  function announce(): void {
    const kind = currentNode.value?.step.kind ?? null
    const willAnnounce = shouldAnnounce({
      kind,
      state: voiceState.value,
      line: spokenLine.value,
      isSupported: isSupported.value,
    })
    if (!willAnnounce) return
    try {
      speak()
    }
    catch {
      // El emparejamiento cancelar/hablar de VueUse puede fallar en iOS justo
      // tras terminar la locución anterior (03-RESEARCH.md). VOZ-06 exige que
      // esto jamás rompa next()/prev().
    }
  }

  function silence(): void {
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

  return { voiceState, announce, toggle, silence, available, isSupported }
}
