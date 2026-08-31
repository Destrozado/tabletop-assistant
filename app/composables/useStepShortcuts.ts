// app/composables/useStepShortcuts.ts
//
// Quick 260831-g2s: Espacio/Enter equivalen a SIGUIENTE y la flecha
// izquierda a ATRÁS cuando la app se usa en un portátil. Esto NO es un
// `addEventListener` de tres líneas — hay cuatro trampas reales en esta
// pantalla concreta:
//
//   1. Espacio y Enter activan de forma NATIVA el botón que tenga el foco.
//      Tras pulsar SIGUIENTE/ATRÁS con el ratón, ese botón conserva el foco
//      en Chrome/Firefox: un listener ingenuo sumaría su avance al nativo
//      (doble avance). Ver D-Q1.
//   2. Espacio desplaza la página por defecto.
//   3. Hay cinco estados de overlay (índice, modal de detalle, reanudación,
//      aviso de contenido cambiado, diálogo de descarte) que deben
//      desactivar el atajo por completo — las teclas no deben actuar "por
//      detrás" de un diálogo.
//   4. En un campo de texto, Espacio escribe un espacio y Enter puede enviar
//      un formulario: el atajo no debe robarles la tecla.
//
// D-Q1 resuelve 1 y 2 a la vez con una sola `event.preventDefault()` en el
// único caso en que el atajo decide actuar: esa llamada cancela tanto el
// desplazamiento de la página como la activación nativa del control
// enfocado, sin depender de dónde esté aparcado el foco y sin tocar
// NavBand.vue.
//
// D-Q2: la decisión "dado este evento y este estado, ¿qué toca?" se extrae
// a funciones PURAS (mismo patrón que resolveVoiceState/shouldAnnounce en
// useVoiceAnnouncer.ts), testeadas en el proyecto `app-logic` de Vitest
// (entorno node, SIN DOM). Por eso los tipos de entrada son objetos planos
// con forma de pato, nunca KeyboardEvent/EventTarget reales — la adaptación
// del evento real del DOM ocurre solo en el composable de cableado, más
// abajo.
import type { ComputedRef } from 'vue'
import { useEventListener } from '@vueuse/core'

export interface ShortcutKeyEvent {
  key: string
  repeat: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
  isEditableTarget: boolean
}

export interface ShortcutState {
  resumeResolved: boolean
  hasSession: boolean
  awaitingResumeChoice: boolean
  awaitingContentChangedAck: boolean
  awaitingDiscardConfirm: boolean
  isIndexOpen: boolean
  hasActiveDetail: boolean
}

export type ShortcutAction = 'next' | 'back' | null

// Contrato: TOTAL. Para cualquier entrada devuelve una de las tres salidas,
// nunca lanza — un `throw` aquí rompería next()/prev() en el camino del
// teclado, la misma regla defensiva que VOZ-06 impone en el camino de la
// voz.
//
// Orden de las guardas, de más barata a más específica: `enabled` primero,
// luego autorrepetición (trampa de "mantener pulsado no encadena avances"),
// luego modificadores (Ctrl/Cmd/Alt son atajos de otra cosa), luego el
// campo de texto (trampa 4), y solo al final el mapa de teclas.
export function resolveShortcutAction(event: ShortcutKeyEvent, enabled: boolean): ShortcutAction {
  if (!enabled) return null
  if (event.repeat) return null
  if (event.ctrlKey || event.metaKey || event.altKey) return null
  if (event.isEditableTarget) return null

  // D-Q7: Shift NO bloquea el atajo. Shift+Espacio ("desplazar hacia
  // arriba") es una acción por defecto más que ya secuestramos igual que el
  // desplazamiento normal de Espacio — decisión explícita, no un olvido.
  switch (event.key) {
    case ' ':
    case 'Spacebar': // variante heredada de navegadores antiguos
    case 'Enter':
      return 'next'
    case 'ArrowLeft':
      return 'back'
    default:
      // ArrowRight NO se mapea a propósito: avanzar ya tiene dos teclas
      // (Espacio/Enter) y la simetría invitaría a pedir más comportamiento
      // del que este encargo cubre.
      return null
  }
}

// Contrato: true SOLO si la pantalla está resuelta, hay una sesión activa y
// ninguno de los cinco overlays está abierto. D-Q4: con cualquier overlay
// abierto las teclas no hacen NADA — no se añade cierre por Escape a
// ningún overlay aquí.
export function shortcutsEnabled(state: ShortcutState): boolean {
  return (
    state.resumeResolved
    && state.hasSession
    && !state.awaitingResumeChoice
    && !state.awaitingContentChangedAck
    && !state.awaitingDiscardConfirm
    && !state.isIndexOpen
    && !state.hasActiveDetail
  )
}

// Contrato: acepta la forma de pato (tagName?/isContentEditable?) para poder
// pasarle `event.target` real en el cableado sin un cast a un tipo del DOM.
// Un `<button>` NO es editable: el doble avance que produciría lo resuelve
// `preventDefault()` (D-Q1), no esta guarda.
export function isEditableTarget(target: { tagName?: string, isContentEditable?: boolean } | null): boolean {
  if (!target) return false
  if (target.isContentEditable) return true
  const tag = target.tagName?.toUpperCase()
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

// --- Cableado (D-Q2: aparte de las funciones puras, no se testea) ---------

// Registra un único listener de `keydown` y llama a `handlers.onNext`/
// `handlers.onBack` cuando corresponda. Usa la sobrecarga de
// `useEventListener` SIN target (cae en `defaultWindow` de VueUse, que es
// `undefined` en el servidor): no hay ninguna referencia directa a `window`
// en este fichero, así que `nuxt generate` (SSG) no rompe durante el
// prerender. La limpieza al desechar el scope la aporta el propio
// `useEventListener` (mismo mecanismo que `tryOnScopeDispose` usa en el
// resto del proyecto) — no se añade `onUnmounted` a mano encima.
export function useStepShortcuts(
  enabled: ComputedRef<boolean>,
  handlers: { onNext: () => void, onBack: () => void },
): void {
  useEventListener('keydown', (event: KeyboardEvent) => {
    const shortcutEvent: ShortcutKeyEvent = {
      key: event.key,
      repeat: event.repeat,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      isEditableTarget: isEditableTarget(event.target as { tagName?: string, isContentEditable?: boolean } | null),
    }

    const action = resolveShortcutAction(shortcutEvent, enabled.value)
    if (action === null) return // el atajo no actúa: el comportamiento por defecto del navegador queda intacto (trampa 2)

    // D-Q1: preventDefault() suprime a la vez el desplazamiento de la
    // página por Espacio Y la activación nativa del control que tenga el
    // foco (el botón SIGUIENTE/ATRÁS conserva el foco tras un clic con
    // ratón/trackpad) — una sola llamada, en el único camino en que el
    // atajo decide actuar.
    event.preventDefault()

    // D-Q3: llamada SÍNCRONA, como sentencia plana, dentro del propio
    // manejador de `keydown` — está PROHIBIDO meter aquí un `await`, un
    // `setTimeout` o un `nextTick`. `onNext`/`onBack` invocan `announce()`
    // (useVoiceAnnouncer.ts), que hace `<audio>.play()` / `speechSynthesis.
    // speak()` en el mismo tick; un `keydown` cuenta como gesto de usuario
    // SOLO dentro de su propio manejador. Diferir esta llamada haría que la
    // locución se descartase en silencio en iPad/Safari (fase 03/03.1).
    if (action === 'next') handlers.onNext()
    else handlers.onBack()
  })
}
